self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!_next|static|favicon.ico|api).*))(\\\\.json)?[\\/#\\?]?$",
    "originalSource": "/((?!_next|static|favicon.ico|api).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()