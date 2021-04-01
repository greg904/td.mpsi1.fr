#[macro_use]
mod http_helpers;

mod config;
mod handlers;

use std::convert::Infallible;
use std::sync::Arc;
use std::{future, panic::AssertUnwindSafe};

use futures::FutureExt;
use http::StatusCode;
use hyper::{
    server::conn::AddrStream,
    service::{make_service_fn, service_fn},
};
use hyper::{Body, Request, Response, Server};
use rusqlite::Connection;
use tokio::sync::Mutex;

use crate::config::Config;
use crate::http_helpers::*;

pub(crate) struct Globals {
    config: Config,
    db: Arc<Mutex<Connection>>,
}

impl Globals {
    pub fn new(config: Config, db: Arc<Mutex<Connection>>) -> Self {
        Globals { config, db }
    }

    pub async fn handle(self: Arc<Globals>, req: Request<Body>) -> Response<Body> {
        if req.method() == http::Method::POST && req.uri().path() == "/log-in" {
            return handlers::log_in(req, &self.db, &self.config).await;
        } else if req.method() == http::Method::GET && req.uri().path() == "/students/me" {
            return handlers::me(req, &self.db, &self.config).await;
        } else if req.method() == http::Method::GET && req.uri().path() == "/units" {
            return handlers::units(req, &self.db, &self.config).await;
        } else {
            let mut segments = req.uri().path()[1..].split('/');
            match segments.next() {
                Some("units") => match segments.next().and_then(|s1| s1.parse::<u32>().ok()) {
                    Some(unit_id) => match segments.next() {
                        Some("exercises") => {
                            match segments.next().and_then(|s4| s4.parse::<u32>().ok()) {
                                Some(exercise) if req.method() == http::Method::POST => {
                                    match segments.next() {
                                        Some("state") => {
                                            return handlers::change_exercise_state(
                                                req,
                                                unit_id,
                                                exercise,
                                                &self.db,
                                                &self.config,
                                            )
                                            .await
                                        }
                                        Some("blocked") => {
                                            return handlers::mark_exercise_blocked(
                                                req,
                                                unit_id,
                                                exercise,
                                                &self.db,
                                                &self.config,
                                            )
                                            .await
                                        }
                                        Some("corrected") => {
                                            return handlers::mark_exercise_corrected(
                                                req,
                                                unit_id,
                                                exercise,
                                                &self.db,
                                                &self.config,
                                            )
                                            .await
                                        }
                                        Some("corrections") => {
                                            return handlers::submit_exercise_correction(
                                                req,
                                                unit_id,
                                                exercise,
                                                &self.db,
                                                &self.config,
                                            )
                                            .await
                                        }
                                        _ => {}
                                    }
                                }
                                None if req.method() == http::Method::GET => {
                                    return handlers::unit_exercises(
                                        req,
                                        unit_id,
                                        &self.db,
                                        &self.config,
                                    )
                                    .await
                                }
                                _ => {}
                            }
                        }
                        _ => {}
                    },
                    None => {}
                },
                _ => {}
            }
        }
        empty(StatusCode::NOT_FOUND)
    }
}

#[tokio::main]
pub async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = Config::from_env_vars().expect("failed to read config");
    let addr = ([127, 0, 0, 1], config.port).into();
    let db = Connection::open(&config.db_path)?;

    let globals = Arc::new(Globals::new(config, Arc::new(Mutex::new(db))));

    // For every connection, we must make a `Service` to handle all
    // incoming HTTP requests on said connection.
    let make_svc = make_service_fn(move |conn: &AddrStream| {
        conn.remote_addr();
        // This is the `Service` that will handle the connection.
        // `service_fn` is a helper to convert a function that
        // returns a Response into a `Service`.
        let globals = globals.clone();
        let svc = service_fn(move |req| {
            let globals = globals.clone();
            async move {
                let fut = globals.handle(req);
                let res = match AssertUnwindSafe(fut).catch_unwind().await {
                    Ok(res) => res,
                    Err(err) => {
                        eprintln!("Panic while handling request: {:?}", err);
                        empty(StatusCode::INTERNAL_SERVER_ERROR)
                    }
                };
                Ok::<_, Infallible>(res)
            }
        });
        future::ready(Ok::<_, Infallible>(svc))
    });

    let server = Server::bind(&addr).serve(make_svc);

    server.await?;

    Ok(())
}
