// Native Windows decoration is chosen at window creation; changing it needs a restart.
export function mainWindowChrome(platform: string, nativeWindowsFrame: boolean): { frame: boolean; autoHideMenuBar: boolean } {
  return { frame: platform !== 'win32' || nativeWindowsFrame, autoHideMenuBar: platform === 'win32' };
}

export function usesTrayForMinimize(platform: string, environment: { HYPRLAND_INSTANCE_SIGNATURE?: string }): boolean {
  return platform === 'linux' && Boolean(environment.HYPRLAND_INSTANCE_SIGNATURE);
}
