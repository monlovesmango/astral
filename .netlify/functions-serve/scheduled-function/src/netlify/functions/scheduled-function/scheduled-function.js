var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/is-promise/index.js
var require_is_promise = __commonJS({
  "node_modules/is-promise/index.js"(exports, module2) {
    module2.exports = isPromise;
    module2.exports.default = isPromise;
    function isPromise(obj) {
      return !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
    }
  }
});

// node_modules/@netlify/functions/dist/lib/consts.js
var require_consts = __commonJS({
  "node_modules/@netlify/functions/dist/lib/consts.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.METADATA_VERSION = exports.HTTP_STATUS_OK = exports.HTTP_STATUS_METHOD_NOT_ALLOWED = exports.BUILDER_FUNCTIONS_FLAG = void 0;
    var BUILDER_FUNCTIONS_FLAG = true;
    exports.BUILDER_FUNCTIONS_FLAG = BUILDER_FUNCTIONS_FLAG;
    var HTTP_STATUS_METHOD_NOT_ALLOWED = 405;
    exports.HTTP_STATUS_METHOD_NOT_ALLOWED = HTTP_STATUS_METHOD_NOT_ALLOWED;
    var HTTP_STATUS_OK = 200;
    exports.HTTP_STATUS_OK = HTTP_STATUS_OK;
    var METADATA_VERSION = 1;
    exports.METADATA_VERSION = METADATA_VERSION;
  }
});

// node_modules/@netlify/functions/dist/lib/builder.js
var require_builder = __commonJS({
  "node_modules/@netlify/functions/dist/lib/builder.js"(exports) {
    "use strict";
    var __assign = exports && exports.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p))
              t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.builder = void 0;
    var is_promise_1 = __importDefault(require_is_promise());
    var consts_1 = require_consts();
    var augmentResponse = function(response) {
      var _a;
      if (!response) {
        return response;
      }
      var metadata = { version: consts_1.METADATA_VERSION, builder_function: consts_1.BUILDER_FUNCTIONS_FLAG, ttl: (_a = response.ttl) !== null && _a !== void 0 ? _a : 0 };
      return __assign(__assign({}, response), { metadata });
    };
    var wrapHandler = function(handler2) {
      return function(event, context, callback) {
        if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
          return Promise.resolve({
            body: "Method Not Allowed",
            statusCode: consts_1.HTTP_STATUS_METHOD_NOT_ALLOWED
          });
        }
        var modifiedEvent = __assign(__assign({}, event), { multiValueQueryStringParameters: {}, queryStringParameters: {} });
        var wrappedCallback = function(error, response) {
          return callback === null || callback === void 0 ? void 0 : callback(error, augmentResponse(response));
        };
        var execution = handler2(modifiedEvent, context, wrappedCallback);
        if ((0, is_promise_1.default)(execution)) {
          return execution.then(augmentResponse);
        }
        return execution;
      };
    };
    exports.builder = wrapHandler;
  }
});

// node_modules/@netlify/functions/dist/lib/schedule.js
var require_schedule = __commonJS({
  "node_modules/@netlify/functions/dist/lib/schedule.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.schedule = void 0;
    var schedule2 = function(cron, handler2) {
      return handler2;
    };
    exports.schedule = schedule2;
  }
});

// node_modules/@netlify/functions/dist/lib/graph_request.js
var require_graph_request = __commonJS({
  "node_modules/@netlify/functions/dist/lib/graph_request.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.graphRequest = void 0;
    var buffer_1 = require("buffer");
    var https_1 = require("https");
    var process_1 = require("process");
    var siteId = process_1.env.SITE_ID;
    var GRAPH_HOST = "graph.netlify.com";
    var graphRequest = function(secretToken, requestBody) {
      return new Promise(function(resolve, reject) {
        var port = 443;
        var options = {
          host: GRAPH_HOST,
          path: "/graphql?app_id=".concat(siteId),
          port,
          method: "POST",
          headers: {
            Authorization: "Bearer ".concat(secretToken),
            "Content-Type": "application/json",
            Accept: "application/json",
            "Content-Length": requestBody ? buffer_1.Buffer.byteLength(requestBody) : 0
          }
        };
        var req = (0, https_1.request)(options, function(res) {
          if (res.statusCode !== 200) {
            return reject(new Error(String(res.statusCode)));
          }
          var body = [];
          res.on("data", function(chunk) {
            body.push(chunk);
          });
          res.on("end", function() {
            var data = buffer_1.Buffer.concat(body).toString();
            try {
              resolve(data);
            } catch (error) {
              reject(error);
            }
          });
        });
        req.on("error", function(error) {
          reject(error);
        });
        req.write(requestBody);
        req.end();
      });
    };
    exports.graphRequest = graphRequest;
  }
});

// node_modules/@netlify/functions/dist/lib/graph_token.js
var require_graph_token = __commonJS({
  "node_modules/@netlify/functions/dist/lib/graph_token.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getNetlifyGraphTokenForBuild = exports.getNetlifyGraphToken = void 0;
    var process_1 = require("process");
    var TOKEN_HEADER = "X-Nf-Graph-Token";
    var TOKEN_HEADER_NORMALIZED = "x-nf-graph-token";
    var hasRequestStyleHeaders = function(headers) {
      return headers.get !== void 0 && typeof headers.get === "function";
    };
    var graphTokenFromIncomingHttpStyleHeaders = function(headers) {
      if (TOKEN_HEADER in headers || TOKEN_HEADER_NORMALIZED in headers) {
        var header = headers[TOKEN_HEADER] || headers[TOKEN_HEADER_NORMALIZED];
        if (Array.isArray(header)) {
          return header[0];
        }
        return header;
      }
    };
    var graphTokenFromEnv = function() {
      var token = process_1.env._NETLIFY_GRAPH_TOKEN || process_1.env.NETLIFY_GRAPH_TOKEN;
      return { token };
    };
    var tokenFallback = function(event) {
      var token = event === null || event === void 0 ? void 0 : event.authlifyToken;
      if (token) {
        return { token };
      }
      if (process_1.env.NETLIFY_DEV === "true") {
        return graphTokenFromEnv();
      }
      return { token: null };
    };
    var graphTokenFromEvent = function(event) {
      var headers = event.headers;
      var token = graphTokenFromIncomingHttpStyleHeaders(headers);
      if (token) {
        return { token };
      }
      if (hasRequestStyleHeaders(headers)) {
        return { token: headers.get(TOKEN_HEADER) };
      }
      return tokenFallback(event);
    };
    var isEventRequired = function() {
      var localDev = process_1.env.NETLIFY_DEV === "true";
      var localBuild = !localDev && process_1.env.NETLIFY_LOCAL === "true";
      var remoteBuild = process_1.env.NETLIFY === "true";
      var inBuildPhase = localBuild || remoteBuild;
      var inGetStaticProps = typeof process_1.env._NETLIFY_GRAPH_TOKEN !== "undefined";
      return !inBuildPhase && !inGetStaticProps;
    };
    var incorrectArgumentsErrors = function(event) {
      var requiresEvent = isEventRequired();
      if (requiresEvent && event == null) {
        var errorMessage = "You must provide an event or request to `getNetlifyGraphToken` when used in functions and on-demand builders.";
        return [{ type: "missing-event-in-function", message: errorMessage }];
      }
      if (!requiresEvent && event != null) {
        var errorMessage = "You must not pass arguments to `getNetlifyGraphToken` when used in builds.";
        return [{ type: "provided-event-in-build", message: errorMessage }];
      }
    };
    var logErrors = function(errors) {
      for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
        var error = errors_1[_i];
        console.error(error.message);
      }
    };
    var getNetlifyGraphToken = function(event, supressLog) {
      var errors = incorrectArgumentsErrors(event);
      if (errors) {
        if (!supressLog) {
          logErrors(errors);
        }
        return { errors };
      }
      return event ? graphTokenFromEvent(event) : graphTokenFromEnv();
    };
    exports.getNetlifyGraphToken = getNetlifyGraphToken;
    var getNetlifyGraphTokenForBuild = function() {
      return graphTokenFromEnv();
    };
    exports.getNetlifyGraphTokenForBuild = getNetlifyGraphTokenForBuild;
  }
});

// node_modules/@netlify/functions/dist/lib/secrets_helper.js
var require_secrets_helper = __commonJS({
  "node_modules/@netlify/functions/dist/lib/secrets_helper.js"(exports) {
    "use strict";
    var __assign = exports && exports.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p))
              t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1)
          throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f)
          throw new TypeError("Generator is already executing.");
        while (_)
          try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
              return t;
            if (y = 0, t)
              op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2])
                  _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
        if (op[0] & 5)
          throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSecretsForBuild = exports.getSecrets = void 0;
    var graph_request_1 = require_graph_request();
    var graph_token_1 = require_graph_token();
    var camelize = function(text) {
      var safe = text.replace(/[-_\s.]+(.)?/g, function(_, sub) {
        return sub ? sub.toUpperCase() : "";
      });
      return safe.slice(0, 1).toLowerCase() + safe.slice(1);
    };
    var serviceNormalizeOverrides = {
      GITHUB: "gitHub"
    };
    var formatSecrets = function(result) {
      var _a, _b, _c;
      var responseServices = (_c = (_b = (_a = result === null || result === void 0 ? void 0 : result.data) === null || _a === void 0 ? void 0 : _a.me) === null || _b === void 0 ? void 0 : _b.serviceMetadata) === null || _c === void 0 ? void 0 : _c.loggedInServices;
      if (!responseServices) {
        return {};
      }
      var newSecrets = responseServices.reduce(function(acc, service) {
        var _a2;
        var normalized = serviceNormalizeOverrides[service.service] || camelize(service.friendlyServiceName);
        return __assign(__assign({}, acc), (_a2 = {}, _a2[normalized] = service, _a2));
      }, {});
      return newSecrets;
    };
    var logErrors = function(errors) {
      for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
        var error = errors_1[_i];
        var errorMessage = void 0;
        switch (error.type) {
          case "missing-event-in-function":
            errorMessage = "You must provide an event or request to `getSecrets` when used in functions and on-demand builders.";
            break;
          case "provided-event-in-build":
            errorMessage = "You must not pass arguments to `getSecrets` when used in builds.";
            break;
          default: {
            var exhaustiveCheck = error.type;
            errorMessage = error.type;
            break;
          }
        }
        var message = errorMessage;
        console.error(message);
      }
    };
    var findLoggedInServicesQuery = "query FindLoggedInServicesQuery {\n    me {\n      serviceMetadata {\n        loggedInServices {\n          friendlyServiceName\n          service\n          isLoggedIn\n          bearerToken\n          grantedScopes {\n            scope\n            scopeInfo {\n              category\n              scope\n              display\n              isDefault\n              isRequired\n              description\n              title\n            }\n          }\n        }\n      }\n    }\n  }";
    var getSecretsForToken = function(token) {
      return __awaiter(void 0, void 0, void 0, function() {
        var body, resultBody, result, newSecrets;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              body = JSON.stringify({ query: findLoggedInServicesQuery });
              return [4, (0, graph_request_1.graphRequest)(token, new TextEncoder().encode(body))];
            case 1:
              resultBody = _a.sent();
              result = JSON.parse(resultBody);
              newSecrets = formatSecrets(result);
              return [2, newSecrets];
          }
        });
      });
    };
    var getSecrets = function(event) {
      return __awaiter(void 0, void 0, void 0, function() {
        var graphTokenResponse, graphToken;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              graphTokenResponse = (0, graph_token_1.getNetlifyGraphToken)(event, true);
              graphToken = graphTokenResponse.token;
              if (!graphToken) {
                if (graphTokenResponse.errors) {
                  logErrors(graphTokenResponse.errors);
                }
                return [2, {}];
              }
              return [4, getSecretsForToken(graphToken)];
            case 1:
              return [2, _a.sent()];
          }
        });
      });
    };
    exports.getSecrets = getSecrets;
    var getSecretsForBuild = function() {
      return __awaiter(void 0, void 0, void 0, function() {
        var graphTokenResponse, graphToken;
        return __generator(this, function(_a) {
          switch (_a.label) {
            case 0:
              graphTokenResponse = (0, graph_token_1.getNetlifyGraphTokenForBuild)();
              graphToken = graphTokenResponse.token;
              if (!graphToken) {
                if (graphTokenResponse.errors) {
                  logErrors(graphTokenResponse.errors);
                }
                return [2, {}];
              }
              return [4, getSecretsForToken(graphToken)];
            case 1:
              return [2, _a.sent()];
          }
        });
      });
    };
    exports.getSecretsForBuild = getSecretsForBuild;
  }
});

// node_modules/@netlify/functions/dist/lib/graph.js
var require_graph = __commonJS({
  "node_modules/@netlify/functions/dist/lib/graph.js"(exports) {
    "use strict";
    var __assign = exports && exports.__assign || function() {
      __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p))
              t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1)
          throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f)
          throw new TypeError("Generator is already executing.");
        while (_)
          try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
              return t;
            if (y = 0, t)
              op = [op[0] & 2, t.value];
            switch (op[0]) {
              case 0:
              case 1:
                t = op;
                break;
              case 4:
                _.label++;
                return { value: op[1], done: false };
              case 5:
                _.label++;
                y = op[1];
                op = [0];
                continue;
              case 7:
                op = _.ops.pop();
                _.trys.pop();
                continue;
              default:
                if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                  _ = 0;
                  continue;
                }
                if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                  _.label = op[1];
                  break;
                }
                if (op[0] === 6 && _.label < t[1]) {
                  _.label = t[1];
                  t = op;
                  break;
                }
                if (t && _.label < t[2]) {
                  _.label = t[2];
                  _.ops.push(op);
                  break;
                }
                if (t[2])
                  _.ops.pop();
                _.trys.pop();
                continue;
            }
            op = body.call(thisArg, _);
          } catch (e) {
            op = [6, e];
            y = 0;
          } finally {
            f = t = 0;
          }
        if (op[0] & 5)
          throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.withSecrets = exports.getNetlifyGraphTokenForBuild = exports.getNetlifyGraphToken = exports.getSecretsForBuild = exports.getSecrets = void 0;
    var secrets_helper_1 = require_secrets_helper();
    var secrets_helper_2 = require_secrets_helper();
    Object.defineProperty(exports, "getSecrets", { enumerable: true, get: function() {
      return secrets_helper_2.getSecrets;
    } });
    Object.defineProperty(exports, "getSecretsForBuild", { enumerable: true, get: function() {
      return secrets_helper_2.getSecretsForBuild;
    } });
    var graph_token_1 = require_graph_token();
    Object.defineProperty(exports, "getNetlifyGraphToken", { enumerable: true, get: function() {
      return graph_token_1.getNetlifyGraphToken;
    } });
    Object.defineProperty(exports, "getNetlifyGraphTokenForBuild", { enumerable: true, get: function() {
      return graph_token_1.getNetlifyGraphTokenForBuild;
    } });
    var withSecrets = function(handler2) {
      return function(event, context, callback) {
        return __awaiter(void 0, void 0, void 0, function() {
          var secrets;
          return __generator(this, function(_a) {
            switch (_a.label) {
              case 0:
                return [4, (0, secrets_helper_1.getSecrets)(event)];
              case 1:
                secrets = _a.sent();
                return [2, handler2(event, __assign(__assign({}, context), { secrets }), callback)];
            }
          });
        });
      };
    };
    exports.withSecrets = withSecrets;
  }
});

// node_modules/@netlify/functions/dist/function/index.js
var require_function = __commonJS({
  "node_modules/@netlify/functions/dist/function/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getNetlifyGraphTokenForBuild = exports.getNetlifyGraphToken = exports.withSecrets = exports.getSecretsForBuild = exports.getSecrets = void 0;
    var graph_1 = require_graph();
    Object.defineProperty(exports, "getSecrets", { enumerable: true, get: function() {
      return graph_1.getSecrets;
    } });
    Object.defineProperty(exports, "getSecretsForBuild", { enumerable: true, get: function() {
      return graph_1.getSecretsForBuild;
    } });
    Object.defineProperty(exports, "withSecrets", { enumerable: true, get: function() {
      return graph_1.withSecrets;
    } });
    Object.defineProperty(exports, "getNetlifyGraphToken", { enumerable: true, get: function() {
      return graph_1.getNetlifyGraphToken;
    } });
    Object.defineProperty(exports, "getNetlifyGraphTokenForBuild", { enumerable: true, get: function() {
      return graph_1.getNetlifyGraphTokenForBuild;
    } });
  }
});

// node_modules/@netlify/functions/dist/main.js
var require_main = __commonJS({
  "node_modules/@netlify/functions/dist/main.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
          __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.schedule = exports.builder = void 0;
    var builder_1 = require_builder();
    Object.defineProperty(exports, "builder", { enumerable: true, get: function() {
      return builder_1.builder;
    } });
    var schedule_1 = require_schedule();
    Object.defineProperty(exports, "schedule", { enumerable: true, get: function() {
      return schedule_1.schedule;
    } });
    __exportStar(require_function(), exports);
  }
});

// netlify/functions/scheduled-function/scheduled-function.ts
var scheduled_function_exports = {};
__export(scheduled_function_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(scheduled_function_exports);
var import_functions = __toESM(require_main());
var handler = (0, import_functions.schedule)("@hourly", async (event) => {
  const eventBody = JSON.parse(event.body);
  console.log(`Next function run at ${eventBody.next_run}.`);
  return {
    statusCode: 200
  };
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=scheduled-function.js.map
