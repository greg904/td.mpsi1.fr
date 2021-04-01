use std::convert::TryInto;

use bytes::buf::BufMut;
use http::{Request, StatusCode};
use hyper::{body::HttpBody, Body, Response};
use serde::Serialize;

use crate::config::Config;

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

/// Extracts the bearer token from an HTTP request.
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

pub(crate) enum CollectBodyError {
    ReadError(hyper::Error),
    TooLarge,
}

/// Concatenates chunks from the body into a vector and returns it.
pub(crate) async fn collect_body(
    body: &mut Body,
    max_len: usize,
) -> Result<Vec<u8>, CollectBodyError> {
    let size_hint: usize = match body.size_hint().lower().try_into() {
        Ok(val) => val,
        Err(_) => return Err(CollectBodyError::TooLarge),
    };
    if size_hint > max_len {
        return Err(CollectBodyError::TooLarge);
    }
    let mut r = Vec::with_capacity(size_hint);
    while let Some(chunk) = body.data().await {
        let chunk = match chunk {
            Ok(val) => val,
            Err(err) => return Err(CollectBodyError::ReadError(err)),
        };
        if r.len() + chunk.len() > max_len {
            return Err(CollectBodyError::TooLarge);
        }
        r.put(chunk);
    }
    Ok(r)
}

/// Warn about an issue that happened during the handling of a request.
pub(crate) fn warn_for_req(req: &Request<Body>, config: &Config, msg: &str) {
    let ip = config
        .real_ip_header
        .as_ref()
        .and_then(|h| req.headers().get(h))
        .and_then(|v| v.to_str().ok())
        .unwrap_or("(unknown IP)");
    eprintln!("[{}] {}", ip, msg);
}
