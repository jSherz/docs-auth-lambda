import { CloudFrontRequest } from "aws-lambda";
import { stringify } from "qs";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  JWT_SECRET,
  REDIRECT_URL,
} from "../vars";

import axios from "axios";

import * as cookie from "cookie";
import * as jsonwebtoken from "jsonwebtoken";

const JWT_ALGO = "HS256";
const COOKIE_NAME = "jwt";
const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

export const isAuthenticated = (req: CloudFrontRequest): boolean => {
  const header = req.headers.cookie;

  if (header && header.length === 1) {
    const rawCookie = header[0].value;
    const cookies = cookie.parse(rawCookie);

    if (cookies[COOKIE_NAME]) {
      try {
        jsonwebtoken.verify(cookies[COOKIE_NAME], JWT_SECRET, {
          algorithms: [JWT_ALGO],
        });

        return true;
      } catch (_err) {
        return false;
      }
    } else {
      return false;
    }
  } else {
    return false;
  }
};

export interface ICodeResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: "Bearer";
  refresh_token: string;
}

export interface IUser {
  iss: string;
  at_hash: string;
  email_verified: "true" | "false";
  sub: string;
  azp: string;
  email: string;
  aud: string;
  iat: string;
  exp: string;
  nonce: string;
  hd: string;
}

export const authenticate = async (code: string): Promise<IUser> => {
  const response = await axios.post<ICodeResponse>(
    "https://www.googleapis.com/oauth2/v4/token",
    stringify({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URL,
    }),
  );

  // we don't verify the token as it's coming directly from Google
  return jsonwebtoken.decode(response.data.id_token) as IUser;
};

export const makeSetCookieHeader = (user: IUser): string => {
  const expires = new Date(new Date().getTime() + ONE_WEEK);

  const jwt = jsonwebtoken.sign(
    {
      email: user.email,
      exp: expires.getTime(),
    },
    JWT_SECRET,
    { algorithm: JWT_ALGO },
  );

  return cookie.serialize(COOKIE_NAME, jwt, { expires });
};

export const makeLogoutCookieHeader = (): string => {
  const expires = new Date(new Date().getTime() - ONE_WEEK);

  return cookie.serialize(COOKIE_NAME, "blah", { expires });
};
