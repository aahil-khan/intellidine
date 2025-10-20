export class ApiResponseDto<T> {
  data: T;
  meta: {
    timestamp: string;
    correlationId: string;
    processingTime?: number;
  };
}

export class ApiErrorDto {
  statusCode: number;
  error: string;
  message: string;
  correlationId: string;
  timestamp: string;
  path: string;
}

export class ServiceHealthDto {
  [key: string]: {
    healthy: boolean;
    url: string;
  };
}
