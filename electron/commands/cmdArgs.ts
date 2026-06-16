


















export type Authed = { token: string };


export type Cmd<T = unknown> = Authed & { request?: T } & Partial<T>;


export function payload<T>(args: Cmd<T>): T {
  return ((args as { request?: T }).request ?? args) as T;
}
