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
    mut req: Request<Body>,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    let b = match collect_body(req.body_mut(), 1024).await {
        Ok(val) => val,
        Err(CollectBodyError::ReadError(err)) => {
            warn_for_req(
                &req,
                config,
                &format!("failed to read body from log in request: {:?}", err),
            );
            return empty(StatusCode::INTERNAL_SERVER_ERROR);
        }
        Err(CollectBodyError::TooLarge) => {
            warn_for_req(&req, config, "log in request body is too large");
            return empty(StatusCode::PAYLOAD_TOO_LARGE);
        }
    };
    let r: LogInRequest = match serde_json::from_slice(&b) {
        Ok(val) => val,
        Err(err) => {
            warn_for_req(&req, config, &format!("log in request is invalid: {:?}", err));
            return empty(StatusCode::BAD_REQUEST);
        }
    };

    let db = db.lock().await;
    let mut stmt = db.prepare("SELECT id FROM students WHERE username = ? LIMIT 1").unwrap();
    let mut rows = stmt.query(params![r.username]).unwrap();
    let row = rows.next().unwrap();
    let id: u32 = match row {
        Some(row) => row.get(0).unwrap(),
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
    #[serde(rename = "inGroupEven")]
    in_group_even: bool,
}

pub(crate) async fn me(
    req: Request<Body>,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    let student_id = match get_logged_in_user_id(&req, config) {
        Ok(val) => val,
        Err(err) => {
            warn_for_req(
                &req,
                config,
                &format!(
                    "student data request with invalid authentication: {:?}",
                    err
                ),
            );
            return empty(StatusCode::FORBIDDEN);
        }
    };

    let db = db.lock().await;
    let mut stmt =
        db.prepare("SELECT id, username, full_name, in_group_even FROM students WHERE id = ?").unwrap();
    let mut rows = stmt.query(params![student_id]).unwrap();
    let row = match rows.next().unwrap() {
        Some(val) => val,
        None => return empty(StatusCode::UNAUTHORIZED),
    };
    let me = Student {
        id: row.get(0).unwrap(),
        username: row.get(1).unwrap(),
        full_name: row.get(2).unwrap(),
        in_group_even: row.get(3).unwrap(),
    };
    json(&me, StatusCode::OK)
}

#[derive(Serialize)]
struct Unit {
    id: u32,
    name: String,
    #[serde(rename = "exerciseCount")]
    exercise_count: u32,
    #[serde(rename = "deadlineGroupEven")]
    deadline_group_even: String,
    #[serde(rename = "deadlineGroupOdd")]
    deadline_group_odd: String,
}

pub(crate) async fn units(
    req: Request<Body>,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    if let Err(err) = get_logged_in_user_id(&req, config) {
        warn_for_req(
            &req,
            config,
            &format!(
                "list unit exercises request with invalid authentication: {:?}",
                err
            ),
        );
        return empty(StatusCode::FORBIDDEN);
    };

    let db = db.lock().await;
    let mut stmt =
        db.prepare("SELECT id, name, exercise_count, deadline_group_even, deadline_group_odd FROM units").unwrap();
    let mut rows = stmt.query(NO_PARAMS).unwrap();
    let mut result: Vec<Unit> = Vec::new();
    let mut row = rows.next().unwrap();
    while let Some(r) = row {
        result.push(Unit {
            id: r.get(0).unwrap(),
            name: r.get(1).unwrap(),
            exercise_count: r.get(2).unwrap(),
            deadline_group_even: r.get(3).unwrap(),
            deadline_group_odd: r.get(4).unwrap(),
        });
        row = rows.next().unwrap();
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
    #[serde(rename = "teacherCorrectedForGroupEven")]
    teacher_corrected_for_group_even: bool,
    /// The teacher corrected the exercise for group B
    #[serde(rename = "teacherCorrectedForGroupOdd")]
    teacher_corrected_for_group_odd: bool,
    /// A list of digests for the pictures with the correction.
    #[serde(rename = "correctionImages")]
    correction_images: Vec<String>,
}

pub(crate) async fn unit_exercises(
    req: Request<Body>,
    unit_id: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    if let Err(err) = get_logged_in_user_id(&req, config) {
        warn_for_req(
            &req,
            config,
            &format!(
                "list unit exercises request with invalid authentication: {:?}",
                err
            ),
        );
        return empty(StatusCode::FORBIDDEN);
    };

    let db = db.lock().await;

    let exercise_count: u32 = {
        let mut stmt = db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1").unwrap();
        let mut rows = stmt.query(params![unit_id]).unwrap();
        let row = match rows.next().unwrap() {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        row.get(0).unwrap()
    };

    let mut result: Vec<Exercise> = Vec::new();
    result.resize_with(usize::try_from(exercise_count).unwrap(), Default::default);

    let mut stmt = db.prepare("SELECT student_id, exercise, state, username, full_name, in_group_even FROM exercise_student_state INNER JOIN students ON exercise_student_state.student_id = students.id WHERE unit_id = ?").unwrap();
    let mut rows = stmt.query(params![unit_id]).unwrap();
    let mut row = rows.next().unwrap();
    while let Some(r) = row {
        let student_id: u32 = r.get(0).unwrap();
        let exercise_idx: u32 = r.get(1).unwrap();
        let state: u32 = r.get(2).unwrap();
        let student_username: String = r.get(3).unwrap();
        let student_full_name: String = r.get(4).unwrap();
        let student_in_group_even: bool = r.get(5).unwrap();
        let exercise = match result.get_mut(usize::try_from(exercise_idx).unwrap()) {
            Some(val) => val,
            None => panic!("Exercise index out of bounds: {}", exercise_idx),
        };
        let vec = match state {
            0 => &mut exercise.reserved_by,
            1 => &mut exercise.presented_by,
            _ => panic!("Unexpected exercise state: {}", state),
        };
        vec.push(Student {
            id: student_id,
            username: student_username,
            full_name: student_full_name,
            in_group_even: student_in_group_even,
        });
        row = rows.next().unwrap();
    }

    let mut stmt = db.prepare("SELECT index_, blocked, teacher_corrected_for_group_even, teacher_corrected_for_group_odd FROM exercise WHERE unit_id = ?").unwrap();
    let mut rows = stmt.query(params![unit_id]).unwrap();
    let mut row = rows.next().unwrap();
    while let Some(r) = row {
        let exercise_idx: u32 = r.get(0).unwrap();
        let exercise = match result.get_mut(usize::try_from(exercise_idx).unwrap()) {
            Some(val) => val,
            None => panic!("Exercise index out of bounds: {}", exercise_idx),
        };
        exercise.blocked = r.get(1).unwrap();
        exercise.teacher_corrected_for_group_even = r.get(2).unwrap();
        exercise.teacher_corrected_for_group_odd = r.get(3).unwrap();
        row = rows.next().unwrap();
    }

    let mut stmt = db.prepare(
        "SELECT unit_exercise, picture_digest FROM exercise_corrections WHERE unit_id = ?"
    ).unwrap();
    let mut rows = stmt.query(params![unit_id]).unwrap();
    let mut row = rows.next().unwrap();
    while let Some(r) = row {
        let exercise_idx: u32 = r.get(0).unwrap();
        let digest: String = r.get(1).unwrap();
        let exercise = match result.get_mut(usize::try_from(exercise_idx).unwrap()) {
            Some(val) => val,
            None => panic!("Exercise index out of bounds: {}", exercise_idx),
        };
        exercise.correction_images.push(digest);
        row = rows.next().unwrap();
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
    exercise_index: u32,
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
            let mut stmt = db.prepare("DELETE FROM exercise_student_state WHERE student_id = ? AND unit_id = ? AND exercise = ?").unwrap();
            stmt.execute(params![student_id, unit_id, exercise_index]).unwrap();
            return empty(StatusCode::OK);
        }
        ExerciseStudentState::Reserved => 0,
        ExerciseStudentState::Presented => 1,
    };

    let exercise_count: u32 = {
        let mut stmt =
            db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1").unwrap();
        let mut rows = stmt.query(params![unit_id]).unwrap();
        let row = match rows.next().unwrap() {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        row.get(0).unwrap()
    };
    if exercise_index >= exercise_count {
        return empty(StatusCode::NOT_FOUND);
    }

    let mut stmt = db.prepare("INSERT OR REPLACE INTO exercise_student_state (student_id, unit_id, exercise, state) VALUES (?, ?, ?, ?)").unwrap();
    let updated_count = stmt.execute(params![student_id, unit_id, exercise_index, new_state]).unwrap();
    if updated_count == 0 {
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
            db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1").unwrap();
        let mut rows = stmt.query(params![unit_id]).unwrap();
        let row = match rows.next().unwrap() {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        row.get(0).unwrap()
    };
    if exercise >= exercise_count {
        return empty(StatusCode::NOT_FOUND);
    }

    let mut stmt = db.prepare("INSERT INTO exercise (unit_id, index_, blocked) VALUES (?, ?, ?) ON CONFLICT (unit_id, index_) DO UPDATE SET blocked = ?").unwrap();
    stmt.execute(params![unit_id, exercise, blocked, blocked]).unwrap();

    empty(StatusCode::OK)
}

pub(crate) async fn mark_exercise_corrected(
    req: Request<Body>,
    unit_id: u32,
    exercise_index: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Accessing this resource requires authentication.
    let student_id = try_401!(get_logged_in_user_id(&req, config));

    let b = try_400!(hyper::body::to_bytes(req).await);
    let corrected: bool = try_400!(serde_json::from_slice(&b));

    let db = db.lock().await;

    let in_group_even: bool = {
        let mut stmt = db.prepare("SELECT in_group_even FROM students WHERE id = ?").unwrap();
        let mut rows = stmt.query(params![student_id]).unwrap();
        let row = match rows.next().unwrap() {
            Some(val) => val,
            None => return empty(StatusCode::UNAUTHORIZED),
        };
        row.get(0).unwrap()
    };

    let exercise_count: u32 = {
        let mut stmt =
            db.prepare("SELECT exercise_count FROM units WHERE id = ? LIMIT 1").unwrap();
        let mut rows = stmt.query(params![unit_id]).unwrap();
        let row = match rows.next().unwrap() {
            Some(val) => val,
            None => return empty(StatusCode::NOT_FOUND),
        };
        row.get(0).unwrap()
    };
    if exercise_index >= exercise_count {
        return empty(StatusCode::NOT_FOUND);
    }

    let field = if in_group_even {
        "teacher_corrected_for_group_even"
    } else {
        "teacher_corrected_for_group_odd"
    };
    let query = format!("INSERT INTO exercise (unit_id, index_, {}) VALUES (?, ?, ?) ON CONFLICT (unit_id, index_) DO UPDATE SET {} = ?", field, field);
    let mut stmt = db.prepare(&query).unwrap();
    stmt.execute(params![unit_id, exercise_index, corrected, corrected]).unwrap();

    empty(StatusCode::OK)
}

pub(crate) async fn submit_exercise_correction(
    mut req: Request<Body>,
    unit_id: u32,
    exercise_index: u32,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    let student_id = match get_logged_in_user_id(&req, config) {
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
    if exercise_index >= exercise_count {
        warn_for_req(
            &req,
            config,
            &format!(
                "correction submission for non existing exercise {} in unit {}",
                exercise_index, unit_id
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
        if let Err(err) = stmt.execute(params![unit_id, exercise_index, student_id, digest_base64]) {
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

pub(crate) async fn delete_exercise_correction(
    req: Request<Body>,
    unit_id: u32,
    exercise_index: u32,
    correction_digest: String,
    db: &Mutex<Connection>,
    config: &Config,
) -> Response<Body> {
    // Make sure that the user is logged in.
    if let Err(err) = get_logged_in_user_id(&req, config) {
        warn_for_req(
            &req,
            config,
            &format!(
                "exercise correction deletion request with invalid authentication: {:?}",
                err
            ),
        );
        return empty(StatusCode::FORBIDDEN);
    };

    let db = db.lock().await;
    let mut stmt = match db.prepare("DELETE FROM exercise_corrections WHERE unit_id = ? AND unit_exercise = ? AND picture_digest = ?") {
        Ok(val) => val,
        Err(err) => {
            warn_for_req(
                &req,
                config,
                &format!(
                    "failed to prepare exercise correction deletion statement: {:?}",
                    err
                ),
            );
            return empty(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    // If the correction entry was not found, then the statement won't return
    // an error so we will return OK too.
    if let Err(err) = stmt.execute(params![unit_id, exercise_index, correction_digest]) {
        warn_for_req(
            &req,
            config,
            &format!("failed to delete exercise correction: {:?}", err),
        );
        return empty(StatusCode::INTERNAL_SERVER_ERROR);
    }

    empty(StatusCode::OK)
}
