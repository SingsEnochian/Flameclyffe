// ==WindhawkMod==
// @id              wayglass-veil-launcher
// @name            Wayglass Veil · local shell doorway
// @description     Opens the local Wayglass WTL Atelier using Ctrl+Alt+W. No Explorer hooks or credential capture.
// @version         0.1
// @author          Wayglass contributors
// @include         explorer.exe
// @compilerOptions -lshell32
// ==/WindhawkMod==

// Stage-1 doorway only: NOT a transparent, always-on-top compositor.
// No Explorer detours, subclassing, memory patching, network requests or background model calls.
// Owner controls the loopback-only bridge. No remote address is accepted.
#include <windows.h>
#include <shellapi.h>
static HANDLE gThread = nullptr;
static DWORD gThreadId = 0;
static constexpr int kHotkey = 0x5747;
DWORD WINAPI DoorwayThread(LPVOID) {
    if (!RegisterHotKey(nullptr, kHotkey, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 'W')) return 0;
    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0) > 0) {
        if (msg.message == WM_HOTKEY && msg.wParam == kHotkey) {
            ShellExecuteW(nullptr, L"open", L"http://127.0.0.1:3000/wayglass/?room=atelier", nullptr, nullptr, SW_SHOWNORMAL);
        }
    }
    UnregisterHotKey(nullptr, kHotkey);
    return 0;
}
BOOL Wh_ModInit() {
    gThread = CreateThread(nullptr, 0, DoorwayThread, nullptr, 0, 0, &gThreadId);
    return gThread != nullptr;
}
void Wh_ModUninit() {
    if (gThreadId) PostThreadMessageW(gThreadId, WM_QUIT, 0, 0);
    if (gThread) { WaitForSingleObject(gThread, 2000); CloseHandle(gThread); gThread = nullptr; }
    gThreadId = 0;
}
