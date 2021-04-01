use http::{Request, StatusCode};
use hyper::{Body, Response};
use serde::Serialize;

macro_rules! r#try_500 {
    ($expr:expr $(,)?) => {
        match $expr {
            Ok(val) => val,
            Err(err) => {
                eprintln!("Error while handling request: {:?}", err);
                return $crate::http_helpers::empty(::http::StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    };
}

macro_rules! r#try_400 {
    ($expr:expr $(,)?) => {
        match $expr {
            Ok(val) => val,
            Err(err) => {
                eprintln!("Bad request: {:?}", err);
                return $crate::http_helpers::empty(::http::StatusCode::BAD_REQUEST);
            }
        }
    };
}

macro_rules! r#try_401 {
    ($expr:expr $(,)?) => {
        match $expr {
            Ok(val) => val,
            Err(err) => {
                eprintln!("Auth failed in request: {:?}", err);
                return $crate::http_helpers::empty(::http::StatusCode::UNAUTHORIZED);
            }
        }
    };
}

pub(crate) fn empty(status: StatusCode) -> Response<Body> {
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .body("null".into())
        .unwrap()
}

pub(crate) fn json<T: ?Sized + Serialize>(value: &T, status: StatusCode) -> Response<Body> {
    Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .body(try_500!(serde_json::to_string(value)).into())
        .unwrap()
}

pub(crate) fn get_bearer(req: &Request<Body>) -> Option<&str> {
    let auth_header = req.headers().get(http::header::AUTHORIZATION)?;
    let mut parts = auth_header.to_str().ok()?.split_ascii_whitespace();
    if let (Some(ty), Some(creds)) = (parts.next(), parts.next()) {
        if ty.to_ascii_lowercase() == "bearer" {
            return Some(creds);
        }
    }
    None
}
