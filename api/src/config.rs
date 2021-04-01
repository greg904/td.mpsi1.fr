use std::env;
use std::env::VarError;
use std::io;
use std::path::PathBuf;

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

    /// The header which contains the client's real IP (in case we are serving
    /// requests through a proxy).
    pub real_ip_header: Option<String>,
}

fn env_var(key: &str) -> io::Result<String> {
    env::var(key).map_err(|err| match err {
        VarError::NotPresent => io::Error::new(io::ErrorKind::NotFound, format!("missing {}", key)),
        VarError::NotUnicode(_) => io::Error::new(
            io::ErrorKind::InvalidData,
            format!("environment variable {} contains invalid unicode data", key),
        ),
    })
}

fn env_var_opt(key: &str) -> io::Result<Option<String>> {
    match env::var(key) {
        Ok(val) => Ok(Some(val)),
        Err(VarError::NotPresent) => Ok(None),
        Err(VarError::NotUnicode(_)) => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("environment variable {} contains invalid unicode data", key),
        )),
    }
}

impl Config {
    /// Retrieves the configuration from environment variables.
    ///
    /// An error is returned if an environment variable is missing or contains
    /// invalid data.
    pub fn from_env_vars() -> io::Result<Config> {
        let port = env_var("HTTP_PORT").and_then(|p| {
            p.parse()
                .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))
        })?;
        let password = env_var("APP_PASSWD")?;
        let db_path = env_var("DB_PATH")?;
        let corrections_path = env_var("CORRECTIONS_PATH")?;
        let secret = base64::decode(env_var("APP_SECRET")?)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
        let real_ip_header = env_var_opt("REAL_IP_HEADER")?;
        Ok(Config {
            port,
            password,
            db_path: db_path.into(),
            corrections_path: corrections_path.into(),
            secret,
            real_ip_header,
        })
    }
}
