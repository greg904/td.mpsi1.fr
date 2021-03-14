use std::env;
use std::io;

pub(crate) struct Config {
    pub port: u16,
    pub password: String,
    pub db_path: String,
    pub secret: Vec<u8>,
}

impl Config {
    pub fn from_env_vars() -> io::Result<Config> {
        let port = Config::env_var("HTTP_PORT")
            .and_then(|p| p.parse()
                .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err)))?;
        let password = Config::env_var("APP_PASSWD")?;
        let db_path = Config::env_var("DB_PATH")?;
        let secret = base64::decode(Config::env_var("APP_SECRET")?)
            .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
        Ok(Config { port, password, db_path, secret })
    }

    fn env_var(key: &str) -> io::Result<String> {
        env::var(key)
            .map_err(|err| match err {
                env::VarError::NotPresent => io::Error::new(io::ErrorKind::NotFound, format!("missing {}", key)),
                env::VarError::NotUnicode(_) => io::Error::new(io::ErrorKind::InvalidData, err),
            })
    }
}
