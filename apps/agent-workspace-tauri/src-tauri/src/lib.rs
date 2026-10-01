use serde::Serialize;

#[derive(Serialize)]
struct HostCapabilities {
    mode: &'static str,
    privileged: bool,
    os: &'static str,
    arch: &'static str,
    family: &'static str,
    arbitrary_shell: bool,
}

#[tauri::command]
fn host_capabilities() -> HostCapabilities {
    HostCapabilities {
        mode: "tauri",
        privileged: true,
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        family: std::env::consts::FAMILY,
        arbitrary_shell: false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![host_capabilities])
        .run(tauri::generate_context!())
        .expect("error while running House Workspace OS");
}
