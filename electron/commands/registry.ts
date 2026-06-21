



















let ipcMain: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.ipcMain && typeof electron.ipcMain.handle === 'function') {
    ipcMain = electron.ipcMain;
  }
} catch {
  
}








type Handler<A = any, R = any> = (args: A) => R | Promise<R>;


type AnyHandler = Handler;;

const commands = new Map<string, AnyHandler>();

export function ipcRegister<A = any, R = any>(name: string, handler: Handler<A, R>): void {
  if (commands.has(name)) {
    
    console.warn(`[registry] command '${name}' re-registered; overwriting`);
    if (ipcMain) {
      try { ipcMain.removeHandler(name); } catch {  }
    }
  }
  commands.set(name, handler);
  if (ipcMain) {
    ipcMain.handle(name, async (_event: unknown, args: any) => handler(args));
  }
}

export function getCommand(name: string): AnyHandler | undefined {
  return commands.get(name);
}

export function allCommands(): ReadonlyMap<string, AnyHandler> {
  return commands;
}

export function commandCount(): number {
  return commands.size;
}













export function wrapCommand(
  name: string,
  wrapper: (args: any, original: AnyHandler) => any,
): void {
  const original = commands.get(name);
  if (!original) {
    throw new Error(`[registry] cannot wrap unknown command '${name}'`);
  }
  const wrapped: AnyHandler = (args: any) => wrapper(args, original);
  commands.set(name, wrapped);
  if (ipcMain) {
    try { ipcMain.removeHandler(name); } catch {  }
    ipcMain.handle(name, async (_event: unknown, args: any) => wrapped(args));
  }
}
