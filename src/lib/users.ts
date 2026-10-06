import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { isRole, type Role } from "./roles";

const USERS_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.USERS_FILE ?? "data/users.json");

export type User = { username: string; role: Role; passwordHash: string; createdAt: string };
export type PublicUser = Omit<User, "passwordHash">;

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;
const MIN_PASSWORD = 8;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scryptAsync(password, salt)).toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function load(): Promise<User[]> {
  try {
    const data = JSON.parse(await fs.readFile(USERS_FILE, "utf8"));
    return Array.isArray(data) ? data.filter((u) => u && typeof u.username === "string" && isRole(u.role)) : [];
  } catch {
    return [];
  }
}

// 同時書き込みで更新が失われないよう、書き込みは直列化する。
let queue: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: (users: User[]) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const users = await load();
    const result = await fn(users);
    await fs.mkdir(path.dirname(USERS_FILE), { recursive: true });
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

const toPublic = ({ passwordHash: _omit, ...rest }: User): PublicUser => rest;

function validate(username: string, password?: string) {
  if (!USERNAME_RE.test(username)) throw new Error("ユーザー名は英数字と _ . - の3〜32文字で入力してください");
  if (password !== undefined && password.length < MIN_PASSWORD)
    throw new Error(`パスワードは${MIN_PASSWORD}文字以上で入力してください`);
}

export async function hasUsers(): Promise<boolean> {
  return (await load()).length > 0;
}

/** 初期オーナーを作成する。ユーザーが1人もいないときだけ作れる。 */
export async function setupOwner(username: string, password: string): Promise<PublicUser> {
  validate(username, password);
  const passwordHash = await hashPassword(password);
  return mutate((users) => {
    if (users.length > 0) throw new Error("初期設定はすでに完了しています");
    const user: User = { username, role: "owner", passwordHash, createdAt: new Date().toISOString() };
    users.push(user);
    return toPublic(user);
  });
}

export async function findUser(username: string): Promise<PublicUser | null> {
  const user = (await load()).find((u) => u.username === username);
  return user ? toPublic(user) : null;
}

export async function listUsers(): Promise<PublicUser[]> {
  return (await load()).map(toPublic);
}

/** ユーザー名とパスワードを検証する。ユーザーの有無が分からないよう、常にハッシュ計算を行う。 */
export async function authenticate(username: string, password: string): Promise<PublicUser | null> {
  const user = (await load()).find((u) => u.username === username);
  const ok = await verifyPassword(password, user?.passwordHash ?? "00:00");
  return user && ok ? toPublic(user) : null;
}

export async function createUser(username: string, password: string, role: Role): Promise<PublicUser> {
  validate(username, password);
  const passwordHash = await hashPassword(password);
  return mutate((users) => {
    if (users.some((u) => u.username === username)) throw new Error("そのユーザー名はすでに使われています");
    const user: User = { username, role, passwordHash, createdAt: new Date().toISOString() };
    users.push(user);
    return toPublic(user);
  });
}

export async function updateUser(username: string, patch: { role?: Role; password?: string }): Promise<void> {
  if (patch.password !== undefined) validate(username, patch.password);
  const passwordHash = patch.password !== undefined ? await hashPassword(patch.password) : undefined;
  await mutate((users) => {
    const user = users.find((u) => u.username === username);
    if (!user) throw new Error("ユーザーが見つかりません");
    if (patch.role && patch.role !== user.role) {
      if (user.role === "owner" && users.filter((u) => u.role === "owner").length === 1)
        throw new Error("最後のオーナーのロールは変更できません");
      user.role = patch.role;
    }
    if (passwordHash) user.passwordHash = passwordHash;
  });
}

export async function deleteUser(username: string): Promise<void> {
  await mutate((users) => {
    const i = users.findIndex((u) => u.username === username);
    if (i < 0) throw new Error("ユーザーが見つかりません");
    if (users[i].role === "owner" && users.filter((u) => u.role === "owner").length === 1)
      throw new Error("最後のオーナーは削除できません");
    users.splice(i, 1);
  });
}
