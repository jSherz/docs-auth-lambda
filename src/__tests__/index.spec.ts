import { CloudFrontRequest, CloudFrontRequestEvent } from "aws-lambda";
import { AxiosError } from "axios";
import { handler } from "../index";
import { IUser } from "../services/auth";

jest.mock("../services");
jest.mock("../vars");

describe("index", () => {
  beforeAll(() => {
    const varsModule = require("../vars");
    varsModule.ROOT_URL = "https://mydocs.cloudfront.net";
    varsModule.REDIRECT_URL = varsModule.ROOT_URL + "/login.php3";
    varsModule.DOMAIN = "another-domainz.com";
  });

  const mockConsole = () => {
    const logSpy = jest.fn();
    const errorSpy = jest.fn();

    console.log = logSpy;
    console.error = errorSpy;

    return [logSpy, errorSpy];
  };

  const user: IUser = {
    at_hash: "sdf235u8",
    aud: "wot",
    azp: "wat",
    email: "waynes@another-domainz.com",
    email_verified: "true",
    exp: 2312123, // invalid (already expired),
    hd: "another-domainz.com",
    iat: 412341234,
    iss: "a space station",
    nonce: "7",
    sub: "scription",
  };

  it("redirects requests with no query string to the login page", async () => {
    const [logSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {},
              method: "unused",
              querystring: "",
              uri: "unused",
            },
          },
        },
      ],
    };

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({
      headers: { location: [{ key: "Location", value: "/login.php3" }] },
      status: "302",
    });

    expect(logSpy).toHaveBeenCalledWith(
      "not authenticated & no code - redirecting to login",
    );
  });

  it("passes through requests that are authenticated", async () => {
    const [logSpy] = mockConsole();

    const request: CloudFrontRequest = {
      clientIp: "unused",
      headers: {
        cookie: [
          {
            key: "cookie",
            value: "???",
          },
        ],
      },
      method: "unused",
      querystring: "",
      uri: "unused",
    };

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request,
          },
        },
      ],
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(true);

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual(request);
    expect(logSpy).toHaveBeenCalledWith("auth ok");
    expect(servicesModule.isAuthenticated).toHaveBeenCalledWith(request);
  });

  it("sends the expired cookie when logging out", async () => {
    const [logSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {
                cookie: [
                  {
                    key: "cookie",
                    value: "???",
                  },
                ],
              },
              method: "unused",
              querystring: "",
              uri: "/logout.php3",
            },
          },
        },
      ],
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(true);

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({
      headers: {
        "Location": [
          {
            key: "Location",
            value: "https://mydocs.cloudfront.net/login.php3",
          },
        ],
        "Set-Cookie": [{ key: "Set-Cookie", value: undefined }],
      },
      status: "302",
    });
    expect(logSpy).toHaveBeenCalledWith("logging out");
  });

  it("sends the JWT header when login succeeds", async () => {
    const [logSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {
                cookie: [
                  {
                    key: "cookie",
                    value: "???",
                  },
                ],
              },
              method: "unused",
              querystring: "code=fuubar",
              uri: "unused",
            },
          },
        },
      ],
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.authenticate = jest.fn().mockResolvedValue(user);
    servicesModule.makeSetCookieHeader = jest
      .fn()
      .mockReturnValue("mycookie=wowowowow");

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({
      headers: {
        "Location": [{ key: "Location", value: "https://mydocs.cloudfront.net" }],
        "Set-Cookie": [{ key: "Set-Cookie", value: "mycookie=wowowowow" }],
      },
      status: "302",
    });
    expect(logSpy).toHaveBeenCalledWith("checking code");
    expect(logSpy).toHaveBeenLastCalledWith("login succeeded");
  });

  it("rejects requests that authenticate successfully but with the wrong domain", async () => {
    const badUser: IUser = { ...user, hd: "evilcorp.org" };
    const [logSpy, errorLogSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {
                cookie: [
                  {
                    key: "cookie",
                    value: "???",
                  },
                ],
              },
              method: "unused",
              querystring: "code=fuubar",
              uri: "unused",
            },
          },
        },
      ],
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.authenticate = jest.fn().mockResolvedValue(badUser);
    servicesModule.renderTemplate = jest.fn();

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({
      status: "401",
    });
    expect(logSpy).toHaveBeenCalledWith("checking code");
    expect(errorLogSpy).toHaveBeenCalledWith(
      "non domain user - rejecting request",
    );
    expect(servicesModule.renderTemplate).toHaveBeenCalledWith(
      "Authentication failed - internal access only.",
    );
  });

  it("renders a login page", async () => {
    const [logSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {},
              method: "unused",
              querystring: "",
              uri: "/login.php3",
            },
          },
        },
      ],
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.renderTemplate = jest
      .fn()
      .mockReturnValue("<html>my template</html>");

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({ body: "<html>my template</html>", status: "200" });
    expect(logSpy).toHaveBeenCalledWith("login route - showing template");
  });

  it("shows the login page with error if an error occurs during authentication", async () => {
    const [logSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {},
              method: "unused",
              querystring: "code=tryme",
              uri: "unused",
            },
          },
        },
      ],
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.authenticate = jest
      .fn()
      .mockRejectedValue(new Error("blah"));
    servicesModule.renderTemplate = jest
      .fn()
      .mockReturnValue("<html>error template</html>");

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({
      body: "<html>error template</html>",
      status: "500",
    });
    expect(logSpy).toHaveBeenCalledWith("checking code");
    expect(servicesModule.renderTemplate).toHaveBeenCalledWith("blah");
  });

  it("logs the error response if an error occurs during authentication", async () => {
    const [logSpy, errorLogSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {},
              method: "unused",
              querystring: "code=tryme",
              uri: "unused",
            },
          },
        },
      ],
    };

    const error: AxiosError = {
      config: {},
      message: "a bad thing happened",
      name: "unused",
      response: {
        config: {},
        data: "bad request or some shiz",
        headers: {},
        status: 400,
        statusText: "Bad Request",
      },
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.authenticate = jest.fn().mockRejectedValue(error);
    servicesModule.renderTemplate = jest.fn();

    await handler(event, null as any, null as any);

    expect(logSpy).toHaveBeenCalledWith("checking code");
    expect(errorLogSpy).toHaveBeenCalledWith("failed to authenticate user");
    expect(errorLogSpy).toHaveBeenCalledWith(
      "code 400: bad request or some shiz",
    );
  });

  it("shows an error message if an error occurs outside of authentication", async () => {
    const [, errorLogSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {},
              method: "unused",
              querystring: "unused",
              uri: "/login.php3",
            },
          },
        },
      ],
    };

    const error = new Error("wassup");

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.renderTemplate = jest.fn().mockRejectedValue(error);

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({ body: "Server made a boo boo :(", status: "500" });
    expect(errorLogSpy).toHaveBeenCalledWith(error);
  });

  it("logs the error response if an error occurs outside of authentication", async () => {
    const [, errorLogSpy] = mockConsole();

    const event: CloudFrontRequestEvent = {
      Records: [
        {
          cf: {
            config: {} as any,
            request: {
              clientIp: "unused",
              headers: {},
              method: "unused",
              querystring: "",
              uri: "/login.php3",
            },
          },
        },
      ],
    };

    const error: AxiosError = {
      config: {},
      message: "a bad thing happened",
      name: "unused",
      response: {
        config: {},
        data: "spilt milk",
        headers: {},
        status: 504,
        statusText: "Milk Spilt",
      },
    };

    const servicesModule = require("../services");
    servicesModule.isAuthenticated = jest.fn().mockReturnValue(false);
    servicesModule.renderTemplate = jest.fn().mockRejectedValue(error);

    const result = await handler(event, null as any, null as any);

    expect(result).toEqual({ body: "Server made a boo boo :(", status: "500" });

    expect(errorLogSpy).toHaveBeenCalledWith(error);
    expect(errorLogSpy).toHaveBeenCalledWith(
      "code 504: spilt milk",
    );
  });
});
