import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

type AuthRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
};

type RefreshRequestConfig = AxiosRequestConfig & {
  _skipAuthRefresh?: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";
const AUTH_REFRESH_PATH = "/api/auth/refresh";

export const requests = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshRequest: Promise<void> | null = null;

function getRequestPath(config: Pick<AxiosRequestConfig, "baseURL" | "url">) {
  const requestUrl = config.url || "";

  if (!requestUrl) {
    return "";
  }

  try {
    return new URL(
      requestUrl,
      config.baseURL || API_BASE_URL || "http://localhost",
    ).pathname;
  } catch {
    return requestUrl;
  }
}

function isRefreshRequest(config: AuthRequestConfig) {
  return getRequestPath(config) === AUTH_REFRESH_PATH;
}

function requestTokenRefresh() {
  if (!refreshRequest) {
    const config: RefreshRequestConfig = {
      _skipAuthRefresh: true,
      withCredentials: true,
    };

    refreshRequest = requests
      .post(AUTH_REFRESH_PATH, undefined, config)
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

requests.interceptors.request.use((config) => {
  config.withCredentials = true;

  return config;
});

requests.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AuthRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest._skipAuthRefresh ||
      isRefreshRequest(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await requestTokenRefresh();

      return requests(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
