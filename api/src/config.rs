use std::io;
use std::{env, path::PathBuf};

pub(crate) struct Config {
    /// The port number on which the HTTP server is listening.
    pub port: u16,

    /// The password used to log in.
    pub password: String,

    /// The path to the Sqlite database.
    pub db_path: PathBuf,

    /// The path to a directory where pictures with the correction of an
    /// exercise are stored.
    pub corrections_path: PathBuf,

    /// A secret value that is used to validate the authenticity of the
    /// log in token.
    pub secret: Vec<u8>,
}

impl Config {
    /// Retrieves the configuration from environment variables.
    ///
    /// An error is returned if an environment variable is missing or contains
    /// invalid data.
    pub fn from_env_vars() -> io::Result<Config> {
        let port = Config::env_var("HTTP_PORT").and_then(|p| {
            p.parse()
                .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))
        })?;
        let password = Config::env_var("APP_PASSWD")?;
        let db_path = Config::env_var("DB_PATH")?;
        let corrections_path = Config::env_var("CORRECTIONS_PATH")?;
        let secret = base64::decode(Config::env_var("APP_SECRET")?)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
        Ok(Config {
            port,
            password,
            db_path: db_path.into(),
            corrections_path: corrections_path.into(),
            secret,
        })
    }

    fn env_var(key: &str) -> io::Result<String> {
        env::var(key).map_err(|err| match err {
            env::VarError::NotPresent => {
                io::Error::new(io::ErrorKind::NotFound, format!("missing {}", key))
            }
            env::VarError::NotUnicode(_) => io::Error::new(io::ErrorKind::InvalidData, err),
        })
    }
}
