import { CloudFrontRequest } from "aws-lambda";
import { AxiosPromise } from "axios";
import {
  authenticate,
  ICodeResponse,
  isAuthenticated,
  IUser,
  makeLogoutCookieHeader,
  makeSetCookieHeader,
  TokenTypes,
} from "../auth";

import * as cookie from "cookie";
import * as jsonwebtoken from "jsonwebtoken";
import * as moment from "moment";
import { JWT_SECRET } from "../../vars";

jest.mock("axios");
jest.mock("../../vars");

describe("services/auth", () => {
  beforeAll(() => {
    const varsModule = require("../../vars");
    varsModule.GOOGLE_CLIENT_ID = "app-appy.apps.googleusercontent.com";
    varsModule.GOOGLE_CLIENT_SECRET = "ssh-secret";
    varsModule.JWT_SECRET = "hunter2";
    varsModule.ROOT_URL = "https://mydocs.cloudfront.net";
    varsModule.REDIRECT_URL = varsModule.ROOT_URL + "/login.php3";
    varsModule.DOMAIN = "jsherz.com";
  });

  const user: IUser = {
    at_hash: "asdasd",
    aud: "wot",
    azp: "wat",
    email: "foo@example.com",
    email_verified: "true",
    exp: 54321, // invalid (already expired),
    hd: "my-little-domainy.com",
    iat: 31232,
    iss: "a space station",
    nonce: "7",
    sub: "scription",
  };

  describe("isAuthenticated", () => {
    it("rejects requests with no cookie", () => {
      const req: Partial<CloudFrontRequest> = {
        headers: {},
      };

      expect(isAuthenticated(req as any)).toEqual(false);
    });

    it("rejects requests with other cookies but not the auth cookie", () => {
      const req: Partial<CloudFrontRequest> = {
        headers: {
          cookie: [{
            key: "cookie",
            value: "mynaughtyadid=123812jwdfu; foobar=188ukasdko; troll=128y8df",
          }],
        },
      };

      expect(isAuthenticated(req as any)).toEqual(false);
    });

    it("rejects requests with an invalid JWT", () => {
      const invalidJwt = jsonwebtoken.sign(
        {
          blah: "foo",
        },
        "invalidsecret",
        { algorithm: "HS256" },
      );

      const authCookie = cookie.serialize("jwt", invalidJwt);

      const req: Partial<CloudFrontRequest> = {
        headers: {
          cookie: [ {
            key: "cookie",
            value: `myna=123812jwdfu; ${authCookie}; troll=128y8df`,
          }],
        },
      };

      expect(isAuthenticated(req as any)).toEqual(false);
    });

    it("accepts requests with valid JWT headers", () => {
      const validJwt = jsonwebtoken.sign(
        {
          blah: "foo",
        },
        JWT_SECRET,
        { algorithm: "HS256" },
      );

      const authCookie = cookie.serialize("jwt", validJwt);
      const req: Partial<CloudFrontRequest> = {
        headers: {
          cookie: [ {
            key: "cookie",
            value: `myna=123812jwdfu; ${authCookie}; troll=128y8df`,
          }],
        },
      };

      expect(isAuthenticated(req as any)).toEqual(true);
    });
  });

  describe("authenticate", () => {
    const mockGauthRequest = (response: AxiosPromise<ICodeResponse>) => {
      const axiosModule = require("axios");
      axiosModule.post = jest.fn().mockReturnValue(response);
      return axiosModule.post;
    };

    it("throws if making the request to google fails", async () => {
      const err = new Error("The request failed!");
      mockGauthRequest(Promise.reject(err));

      await expect(authenticate("my-test-code")).rejects.toEqual(err);
    });

    it("authenticates with google and returns the user", async () => {
      const jwt = jsonwebtoken.sign(user as any, "blah", {
        algorithm: "HS256",
      });

      const authSpy = mockGauthRequest(
        Promise.resolve({
          config: {},
          data: {
            access_token: "unused",
            expires_in: 123,
            id_token: jwt,
            refresh_token: "unused",
            token_type: TokenTypes.Bearer,
          },
          headers: {},
          status: 200,
          statusText: "OK",
        }),
      );

      await expect(authenticate("my-code123")).resolves.toEqual(user);

      expect(authSpy).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v4/token",
        "client_id=app-appy.apps.googleusercontent.com&" +
          "client_secret=ssh-secret&code=my-code123&" +
          "grant_type=authorization_code&" +
          "redirect_uri=https%3A%2F%2Fmydocs.cloudfront.net%2Flogin.php3",
      );
    });
  });

  const daysFromNow = (start: moment.Moment) =>
    moment(start)
      .startOf("day")
      .diff(moment().startOf("day"), "days");

  const daysAgo = (start: moment.Moment) =>
    moment()
      .startOf("day")
      .diff(moment(start).startOf("day"), "days");

  describe("makeSetCookieHeader", () => {
    it("issues a JWT cookie that expires in a week", () => {
      const header = makeSetCookieHeader(user);

      const cookieParts = cookie.parse(header);
      const cookieExpires = moment(cookieParts.Expires);

      expect(daysFromNow(cookieExpires)).toEqual(7);

      const jwtParts: any = jsonwebtoken.decode(cookieParts.jwt);

      expect(jwtParts.email).toEqual("foo@example.com");
      expect(daysFromNow(moment(jwtParts.exp))).toEqual(7);
    });
  });

  describe("makeLogoutCookieHeader", () => {
    it("issues a cookie that expired a week ago", () => {
      const header = makeLogoutCookieHeader();

      const cookieParts = cookie.parse(header);
      const cookieExpires = moment(cookieParts.Expires);

      expect(daysAgo(cookieExpires)).toEqual(7);
    });
  });
});
