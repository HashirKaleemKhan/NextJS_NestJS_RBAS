import axios from "axios";

const graphqlApi = axios.create({
  baseURL: "http://localhost:3001/graphql",
  headers: {
    "Content-Type": "application/json",
  },
});

graphqlApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await graphqlApi.post("", {
    query,
    variables,
  });

  if (response.data.errors?.length) {
    const message =
      response.data.errors[0]?.message ||
      "GraphQL request failed.";

    throw new Error(message);
  }

  return response.data.data;
}