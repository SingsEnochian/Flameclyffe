use hearthgate_atomic_bridge::{Endpoint, probe_models};
use std::env;
use std::process::ExitCode;
use std::time::Duration;

fn main() -> ExitCode {
    let endpoint_text = env::args()
        .nth(1)
        .or_else(|| env::var("ATOMIC_CHAT_BASE_URL").ok())
        .unwrap_or_else(|| "http://127.0.0.1:1337/v1".into());
    let timeout_ms = env::var("ATOMIC_CHAT_HEALTH_TIMEOUT_MS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(2500)
        .clamp(100, 30000);

    let endpoint = match Endpoint::parse(&endpoint_text) {
        Ok(endpoint) => endpoint,
        Err(error) => {
            eprintln!("{{\"reachable\":false,\"error\":\"{}\"}}", escape(&error.to_string()));
            return ExitCode::from(2);
        }
    };

    let status = probe_models(&endpoint, Duration::from_millis(timeout_ms));
    println!("{}", status.to_json());
    if status.reachable {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(3)
    }
}

fn escape(input: &str) -> String {
    input
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}
