use std::{
    convert::TryFrom,
    io::{Cursor, ErrorKind},
};

use hmac::{Hmac, Mac, NewMac};
use http::StatusCode;
use hyper::{Body, Request, Response};
use image::{io::Reader as ImageReader, GenericImageView, ImageFormat, ImageOutputFormat};
use rusqlite::Error as SqliteError;
use rusqlite::ErrorCode as SqliteErrorCode;
use rusqlite::{params, Connection, NO_PARAMS};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;
use tokio::{fs::OpenOptions, io::AsyncWriteExt, sync::Mutex};

use crate::config::Config;
use crate::http_helpers::*;

type HmacSha256 = Hmac<Sha256>;

#[derive(Deserialize)]
struct LogInRequest {
    username: String,
    password: String,
}

pub(crate) async fn log_in(
    req: Request<Body>,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    let b = try_400!(hyper::body::to_bytes(req).await);
    let r: LogInRequest = try_400!(serde_json::from_slice(&b));
    let db = db.lock().await;
    let mut stmt = try_500!(db.prepare("SELECT id FROM students WHERE username = ? LIMIT 1"));
    let mut rows = try_500!(stmt.query(params![r.username]));
    let row = try_500!(rows.next());
    let id: u32 = match row {
        Some(row) => try_500!(row.get(0)),
        None => return empty(StatusCode::UNAUTHORIZED),
    };
    let passwd_ok: bool = r
        .password
        .as_bytes()
        .ct_eq(config.password.as_bytes())
        .into();
    if !passwd_ok {
        return empty(StatusCode::UNAUTHORIZED);
    }
    let id_str = id.to_string();
    let mut hmac = HmacSha256::new_varkey(&config.secret).unwrap();
    hmac.update(id_str.as_bytes());
    let sig = base64::encode_config(hmac.finalize().into_bytes(), base64::URL_SAFE_NO_PAD);
    let token = format!("{}.{}", id_str, sig);
    json(&token, StatusCode::OK)
}

#[derive(Serialize)]
struct Student {
    id: u32,
    username: String,
    #[serde(rename = "fullName")]
    full_name: String,
    #[serde(rename = "groupA")]
    group_a: bool,
}

pub(crate) async fn me(
    req: Request<Body>,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    let student_id = try_401!(get_logged_in_user_id(&req, config));

    let db = db.lock().await;
    let mut stmt =
        try_500!(db.prepare("SELECT id, username, full_name, group_a FROM students WHERE id = ?"));
    let mut rows = try_500!(stmt.query(params![student_id]));
    let row = match try_500!(rows.next()) {
        Some(val) => val,
        None => return empty(StatusCode::UNAUTHORIZED),
    };
    let me = Student {
        id: try_500!(row.get(0)),
        username: try_500!(row.get(1)),
        full_name: try_500!(row.get(2)),
        group_a: try_500!(row.get(3)),
    };
    json(&me, StatusCode::OK)
}

#[derive(Serialize)]
struct Unit {
    id: u32,
    name: String,
    #[serde(rename = "exerciseCount")]
    exercise_cnt: u32,
    #[serde(rename = "deadlineA")]
    deadline_a: String,
    #[serde(rename = "deadlineB")]
    deadline_b: String,
}

pub(crate) async fn units(
    req: Request<Body>,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    try_401!(get_logged_in_user_id(&req, config));

    let db = db.lock().await;
    let mut stmt =
        try_500!(db.prepare("SELECT id, name, exercise_count, deadline_a, deadline_b FROM units"));
    let mut rows = try_500!(stmt.query(NO_PARAMS));
    let mut result: Vec<Unit> = Vec::new();
    let mut row = try_500!(rows.next());
    while let Some(r) = row {
        result.push(Unit {
            id: try_500!(r.get(0)),
            name: try_500!(r.get(1)),
            exercise_cnt: try_500!(r.get(2)),
            deadline_a: try_500!(r.get(3)),
            deadline_b: try_500!(r.get(4)),
        });
        row = try_500!(rows.next());
    }
    json(&result, StatusCode::OK)
}

#[derive(Serialize, Default)]
struct Exercise {
    #[serde(rename = "reservedBy")]
    reserved_by: Vec<Student>,
    #[serde(rename = "presentedBy")]
    presented_by: Vec<Student>,
    /// For whatever reason, the teacher said that students should not do this
    /// exercise.
    #[serde(rename = "blocked")]
    blocked: bool,
    /// The teacher corrected the exercise for group A
    #[serde(rename = "correctedA")]
    corrected_a: bool,
    /// The teacher corrected the exercise for group B
    #[serde(rename = "correctedB")]
    corrected_b: bool,
    /// A list of digests for the pictures with the correction.
    #[serde(rename = "correctionDigests")]
    correction_digests: Vec<String>,
}

pub(crate) async fn unit_exercises(
    req: Request<Body>,
    unit_id: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    try_401!(get_logged_in_user_id(&req, config));

    let db = db.lock().await;
    let exercise_count: u32 = {
        let mut stmt =
            try_500!(db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1"));
        let mut rows = try_500!(stmt.query(params![unit_id]));
        let row = match try_500!(rows.next()) {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        try_500!(row.get(0))
    };

    let mut result: Vec<Exercise> = Vec::new();
    result.resize_with(try_500!(usize::try_from(exercise_count)), Default::default);

    let mut stmt = try_500!(db.prepare("SELECT student_id, exercise, state, username, full_name, group_a FROM exercise_student_state INNER JOIN students ON exercise_student_state.student_id = students.id WHERE unit_id = ?"));
    let mut rows = try_500!(stmt.query(params![unit_id]));
    let mut row = try_500!(rows.next());
    while let Some(r) = row {
        let student_id: u32 = try_500!(r.get(0));
        let exercise_idx: u32 = try_500!(r.get(1));
        let state: u32 = try_500!(r.get(2));
        let student_username: String = try_500!(r.get(3));
        let student_full_name: String = try_500!(r.get(4));
        let student_group_a: bool = try_500!(r.get(5));
        let exercise = match result.get_mut(try_500!(usize::try_from(exercise_idx))) {
            Some(val) => val,
            None => panic!("Exercise index out of bounds: {}", exercise_idx),
        };
        let vec = match state {
            0 => &mut exercise.reserved_by,
            1 => &mut exercise.presented_by,
            _ => panic!("Unexpected exercise state!"),
        };
        vec.push(Student {
            id: student_id,
            username: student_username,
            full_name: student_full_name,
            group_a: student_group_a,
        });
        row = try_500!(rows.next());
    }

    let mut stmt = try_500!(db.prepare("SELECT index_, blocked, corrected_a, corrected_b FROM exercise_teacher_override WHERE unit_id = ?"));
    let mut rows = try_500!(stmt.query(params![unit_id]));
    let mut row = try_500!(rows.next());
    while let Some(r) = row {
        let exercise_idx: u32 = try_500!(r.get(0));
        let exercise = match result.get_mut(try_500!(usize::try_from(exercise_idx))) {
            Some(val) => val,
            None => panic!("Exercise index out of bounds: {}", exercise_idx),
        };
        exercise.blocked = try_500!(r.get(1));
        exercise.corrected_a = try_500!(r.get(2));
        exercise.corrected_b = try_500!(r.get(3));
        row = try_500!(rows.next());
    }

    let mut stmt = try_500!(db.prepare(
        "SELECT unit_exercise, picture_digest FROM exercise_corrections WHERE unit_id = ?"
    ));
    let mut rows = try_500!(stmt.query(params![unit_id]));
    let mut row = try_500!(rows.next());
    while let Some(r) = row {
        let exercise_idx: u32 = try_500!(r.get(0));
        let digest: String = try_500!(r.get(1));
        let exercise = match result.get_mut(try_500!(usize::try_from(exercise_idx))) {
            Some(val) => val,
            None => panic!("Exercise index out of bounds: {}", exercise_idx),
        };
        exercise.correction_digests.push(digest);
        row = try_500!(rows.next());
    }

    json(&result, StatusCode::OK)
}

#[derive(Deserialize)]
enum ExerciseStudentState {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "reserved")]
    Reserved,
    #[serde(rename = "presented")]
    Presented,
}

pub(crate) async fn change_exercise_state(
    req: Request<Body>,
    unit_id: u32,
    exercise: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    let student_id = try_401!(get_logged_in_user_id(&req, config));

    let b = try_400!(hyper::body::to_bytes(req).await);
    let new_state: ExerciseStudentState = try_400!(serde_json::from_slice(&b));

    let db = db.lock().await;

    let new_state: u32 = match new_state {
        ExerciseStudentState::None => {
            let mut stmt = try_500!(db.prepare("DELETE FROM exercise_student_state WHERE student_id = ? AND unit_id = ? AND exercise = ?"));
            try_500!(stmt.execute(params![student_id, unit_id, exercise]));
            return empty(StatusCode::OK);
        }
        ExerciseStudentState::Reserved => 0,
        ExerciseStudentState::Presented => 1,
    };

    let exercise_count: u32 = {
        let mut stmt =
            try_500!(db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1"));
        let mut rows = try_500!(stmt.query(params![unit_id]));
        let row = match try_500!(rows.next()) {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        try_500!(row.get(0))
    };
    if exercise >= exercise_count {
        return empty(StatusCode::NOT_FOUND);
    }

    let mut stmt = try_500!(db.prepare("INSERT OR REPLACE INTO exercise_student_state (student_id, unit_id, exercise, state) VALUES (?, ?, ?, ?)"));
    let updated_cnt = try_500!(stmt.execute(params![student_id, unit_id, exercise, new_state]));
    if updated_cnt == 0 {
        return empty(StatusCode::NOT_FOUND);
    }

    empty(StatusCode::OK)
}

pub(crate) async fn mark_exercise_blocked(
    req: Request<Body>,
    unit_id: u32,
    exercise: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    try_401!(get_logged_in_user_id(&req, config));

    let b = try_400!(hyper::body::to_bytes(req).await);
    let blocked: bool = try_400!(serde_json::from_slice(&b));

    let db = db.lock().await;

    let exercise_count: u32 = {
        let mut stmt =
            try_500!(db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1"));
        let mut rows = try_500!(stmt.query(params![unit_id]));
        let row = match try_500!(rows.next()) {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        try_500!(row.get(0))
    };
    if exercise >= exercise_count {
        return empty(StatusCode::NOT_FOUND);
    }

    let mut stmt = try_500!(db.prepare("INSERT INTO exercise_teacher_override (unit_id, index_, blocked) VALUES (?, ?, ?) ON CONFLICT (unit_id, index_) DO UPDATE SET blocked = ?"));
    try_500!(stmt.execute(params![unit_id, exercise, blocked, blocked]));

    empty(StatusCode::OK)
}

pub(crate) async fn mark_exercise_corrected(
    req: Request<Body>,
    unit_id: u32,
    exercise: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    let student_id = try_401!(get_logged_in_user_id(&req, config));

    let b = try_400!(hyper::body::to_bytes(req).await);
    let corrected: bool = try_400!(serde_json::from_slice(&b));

    let db = db.lock().await;

    let group_a: bool = {
        let mut stmt = try_500!(db.prepare("SELECT group_a FROM students WHERE id = ?"));
        let mut rows = try_500!(stmt.query(params![student_id]));
        let row = match try_500!(rows.next()) {
            Some(val) => val,
            None => return empty(StatusCode::UNAUTHORIZED),
        };
        try_500!(row.get(0))
    };

    let exercise_count: u32 = {
        let mut stmt =
            try_500!(db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1"));
        let mut rows = try_500!(stmt.query(params![unit_id]));
        let row = match try_500!(rows.next()) {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        try_500!(row.get(0))
    };
    if exercise >= exercise_count {
        return empty(StatusCode::NOT_FOUND);
    }

    let field = if group_a {
        "corrected_a"
    } else {
        "corrected_b"
    };
    let query = format!("INSERT INTO exercise_teacher_override (unit_id, index_, {}) VALUES (?, ?, ?) ON CONFLICT (unit_id, index_) DO UPDATE SET {} = ?", field, field);
    let mut stmt = try_500!(db.prepare(&query));
    try_500!(stmt.execute(params![unit_id, exercise, corrected, corrected]));

    empty(StatusCode::OK)
}

pub(crate) async fn submit_exercise_correction(
    mut req: Request<Body>,
    unit_id: u32,
    exercise: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    let user_id = match get_logged_in_user_id(&req, config) {
        Ok(val) => val,
        Err(err) => {
            warn_for_req(
                &req,
                config,
                &format!(
                    "exercise correction submission with invalid authentication: {:?}",
                    err
                ),
            );
            return empty(StatusCode::FORBIDDEN);
        }
    };

    let exercise_count: u32 = {
        let db = db.lock().await;
        let mut stmt = db
            .prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1")
            .unwrap();
        let mut rows = stmt.query(params![unit_id]).unwrap();
        let row = match rows.next().unwrap() {
            Some(val) => val,
            None => {
                warn_for_req(
                    &req,
                    config,
                    &format!("correction submission with non existing unit {}", unit_id),
                );
                return empty(StatusCode::NOT_FOUND);
            }
        };
        row.get(0).unwrap()
    };
    if exercise >= exercise_count {
        warn_for_req(
            &req,
            config,
            &format!(
                "correction submission for non existing exercise {} in unit {}",
                exercise, unit_id
            ),
        );
        return empty(StatusCode::NOT_FOUND);
    }

    const MAX_PICTURE_SIZE: usize = 1024 * 1024 * 5;

    let b = match collect_body(req.body_mut(), MAX_PICTURE_SIZE).await {
        Ok(val) => val,
        Err(CollectBodyError::ReadError(err)) => {
            warn_for_req(
                &req,
                config,
                &format!("failed to read body from correction submission: {:?}", err),
            );
            return empty(StatusCode::INTERNAL_SERVER_ERROR);
        }
        Err(CollectBodyError::TooLarge) => {
            warn_for_req(&req, config, "correction submission body is too large");
            return empty(StatusCode::PAYLOAD_TOO_LARGE);
        }
    };
    let mut reader = ImageReader::new(Cursor::new(b));
    if let Some(v) = req.headers().get(http::header::CONTENT_TYPE) {
        if v == "image/png" {
            reader.set_format(ImageFormat::Png);
        } else if v == "image/jpeg" {
            reader.set_format(ImageFormat::Jpeg);
        } else if v == "image/gif" {
            reader.set_format(ImageFormat::Gif);
        } else if v == "image/webp" {
            reader.set_format(ImageFormat::WebP);
        } else if v == "image/tiff" {
            reader.set_format(ImageFormat::Tiff);
        } else if v == "image/bmp" {
            reader.set_format(ImageFormat::Bmp);
        } else if v == "image/x-icon" {
            reader.set_format(ImageFormat::Ico);
        } else if v == "image/avif" {
            reader.set_format(ImageFormat::Avif);
        }
    }
    if reader.format().is_none() {
        reader = match reader.with_guessed_format() {
            Ok(val) => val,
            Err(err) => {
                warn_for_req(
                    &req,
                    config,
                    &format!(
                        "failed to guess image format for correction picture: {:?}",
                        err
                    ),
                );
                return empty(StatusCode::BAD_REQUEST);
            }
        };
    }

    let image = match reader.decode() {
        Ok(val) => val,
        Err(err) => {
            warn_for_req(
                &req,
                config,
                &format!("failed to decode correction picture: {:?}", err),
            );
            return empty(StatusCode::BAD_REQUEST);
        }
    };
    if image.width() > 10_000 || image.height() > 10_000 {
        warn_for_req(&req, config, "correction picture dimensions exceed limits");
        return empty(StatusCode::BAD_REQUEST);
    }

    let mut png = Vec::new();
    if let Err(err) = image.write_to(&mut png, ImageOutputFormat::Png) {
        warn_for_req(
            &req,
            config,
            &format!("failed to encode correction picture as PNG: {:?}", err),
        );
        return empty(StatusCode::INTERNAL_SERVER_ERROR);
    }
    if png.len() > MAX_PICTURE_SIZE {
        warn_for_req(&req, config, "encoded PNG image is too large");
        return empty(StatusCode::PAYLOAD_TOO_LARGE);
    }

    let mut hash = Sha256::new();
    hash.update(&png);
    let digest = hash.finalize();
    let digest_base64 = base64::encode_config(digest.as_slice(), base64::URL_SAFE_NO_PAD);

    {
        let db = db.lock().await;
        let mut stmt = db.prepare(
            "INSERT INTO exercise_corrections (unit_id, unit_exercise, created_by, picture_digest) VALUES (?, ?, ?, ?)"
        ).unwrap();
        if let Err(err) = stmt.execute(params![unit_id, exercise, user_id, digest_base64]) {
            match err {
                SqliteError::SqliteFailure(
                    rusqlite::ffi::Error {
                        code: SqliteErrorCode::ConstraintViolation,
                        ..
                    },
                    _,
                ) => {
                    // The unique constraint is violated because the
                    // correction already exists.
                    return empty(StatusCode::CONFLICT);
                }
                _ => {
                    warn_for_req(
                        &req,
                        config,
                        &format!("failed to insert correction entry: {:?}", err),
                    );
                    return empty(StatusCode::INTERNAL_SERVER_ERROR);
                }
            }
        }
    }

    let p = config
        .corrections_path
        .join(format!("{}.png", digest_base64));
    let mut png_file = match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(p)
        .await
    {
        Ok(val) => val,
        Err(err) => {
            if err.kind() == ErrorKind::AlreadyExists {
                // Assume that the files are the same since they have the same
                // hash so we can stop here and use the old file.
                return empty(StatusCode::OK);
            }
            warn_for_req(
                &req,
                config,
                &format!("failed to open correction picture for writing: {:?}", err),
            );
            return empty(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    if let Err(err) = png_file.write_all(&png).await {
        warn_for_req(
            &req,
            config,
            &format!("failed to write correction picture: {:?}", err),
        );
        return empty(StatusCode::INTERNAL_SERVER_ERROR);
    }

    empty(StatusCode::OK)
}
