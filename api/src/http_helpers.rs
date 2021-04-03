use std::convert::TryInto;

use bytes::buf::BufMut;
use hmac::{Hmac, Mac, NewMac};
use http::{Request, StatusCode};
use hyper::{body::HttpBody, Body, Response};
use serde::Serialize;
use sha2::Sha256;

use crate::config::Config;

type HmacSha256 = Hmac<Sha256>;

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
        .body(serde_json::to_string(value).unwrap().into())
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

#[derive(Debug)]
pub(crate) enum HttpAuthError {
    MissingBearer,
    MissingDot,
    InvalidStudentId,
    InvalidSig,
}

pub(crate) fn get_logged_in_user_id(
    req: &Request<Body>,
    config: &Config,
) -> Result<u32, HttpAuthError> {
    let bearer = get_bearer(&req).ok_or(HttpAuthError::MissingBearer)?;
    let dot = bearer.find('.').ok_or(HttpAuthError::MissingDot)?;
    let id_str = &bearer[..dot];
    let id: u32 = id_str.parse().ok().ok_or(HttpAuthError::InvalidStudentId)?;
    let sig = base64::decode_config(&bearer[(dot + 1)..], base64::URL_SAFE_NO_PAD)
        .map_err(|_err| HttpAuthError::InvalidSig)?;
    let mut hmac = HmacSha256::new_varkey(&config.secret).unwrap();
    hmac.update(id_str.as_bytes());
    if hmac.verify(&sig).is_err() {
        return Err(HttpAuthError::InvalidSig);
    }
    Ok(id)
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
