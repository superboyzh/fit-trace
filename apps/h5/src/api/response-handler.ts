import axios, { AxiosError, type AxiosInstance } from 'axios';

interface ResponseHandlers {
  notify: (error: unknown) => void;
  onUnauthorized: () => void;
}

export function installResponseHandlers(client: AxiosInstance, handlers: ResponseHandlers): void {
  function rejectRequest(error: unknown): Promise<never> {
    if (!axios.isCancel(error)) {
      handlers.notify(error);
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.data?.code === 'UNAUTHORIZED')
      ) {
        handlers.onUnauthorized();
      }
    }
    return Promise.reject(error);
  }

  client.interceptors.response.use((response) => {
    const code: unknown = response.data?.code;
    if (typeof code === 'string' && code !== 'OK') {
      return rejectRequest(
        new AxiosError(
          '接口返回业务错误',
          AxiosError.ERR_BAD_RESPONSE,
          response.config,
          response.request,
          response,
        ),
      );
    }
    return response;
  }, rejectRequest);
}
