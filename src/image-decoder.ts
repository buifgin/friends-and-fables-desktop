import { BrowserWindow, nativeImage } from 'electron';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;
let active: { window: BrowserWindow; ready: Promise<void>; users: number } | null = null;

// nativeImage decodes PNG/JPEG. WebP uses Chromium in a temporary, sandboxed
// renderer with no preload, remote content, IPC bridge, or network access.
export async function decodeBackground(buffer: Buffer): Promise<Electron.NativeImage> {
  if (buffer.length > MAX_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  let image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty() && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
    if (!active) {
      const window = new BrowserWindow({ show: false, skipTaskbar: true, width: 1, height: 1, webPreferences: {
        partition: 'fables-image-decoder', sandbox: true, contextIsolation: true, nodeIntegration: false,
        webSecurity: true, backgroundThrottling: false,
      } });
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', event => event.preventDefault());
      window.webContents.on('will-redirect', event => event.preventDefault());
      const html = '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:">';
      active = { window, ready: window.loadURL(`data:text/html,${encodeURIComponent(html)}`), users: 0 };
    }
    const decoder = active;
    decoder.users++;
    try {
      await decoder.ready;
      const dataURL = `data:image/webp;base64,${buffer.toString('base64')}`;
      const png: unknown = await decoder.window.webContents.executeJavaScript(`(async () => {
        const image = new Image(); image.src = ${JSON.stringify(dataURL)};
        await image.decode();
        if (image.naturalWidth * image.naturalHeight > ${MAX_PIXELS}) throw new Error('Choose an image with at most 16 million pixels.');
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        const png = canvas.toDataURL('image/png');
        if (png.length > ${Math.ceil(MAX_BYTES / 3) * 4 + 22}) throw new Error('The decoded image is too large. Try a smaller picture.');
        return png;
      })()`);
      if (typeof png !== 'string' || !png.startsWith('data:image/png;base64,')) throw new Error('This file could not be read as an image.');
      image = nativeImage.createFromDataURL(png);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('16 million pixels') || message.includes('decoded image is too large')) throw new Error(message);
      throw new Error('This file could not be read as an image.');
    } finally {
      if (--decoder.users === 0) { active = null; decoder.window.destroy(); }
    }
  }
  if (image.isEmpty()) throw new Error('This file could not be read as an image.');
  const { width, height } = image.getSize();
  if (width * height > MAX_PIXELS) throw new Error('Choose an image with at most 16 million pixels.');
  return image;
}
