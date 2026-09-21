import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  from,
} from "@apollo/client";

import { SetContextLink } from "@apollo/client/link/context";

const httpLink = new HttpLink({
  uri: "http://localhost:3001/graphql",
});

const authLink = new SetContextLink((prevContext) => {
  if (typeof window === "undefined") {
    return prevContext;
  }

  const token = localStorage.getItem("token");

  return {
    headers: {
      ...prevContext.headers,
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([
    authLink,
    httpLink,
  ]),
  cache: new InMemoryCache(),
});