import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export function signJwt(payload: any) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, SECRET) as any;
  } catch (e) {
    return null;
  }
}
