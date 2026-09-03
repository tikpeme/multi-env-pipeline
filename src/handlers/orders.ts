import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const ENV = process.env.ENV || 'dev';

const log = (level: string, message: string, data?: object) => {
  if (LOG_LEVEL === 'DEBUG' || level !== 'DEBUG') {
    console.log(JSON.stringify({ level, message, env: ENV, ...data }));
  }
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  log('DEBUG', 'Received request', {
    method: event.httpMethod,
    path: event.path,
  });

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { customerId, productId, quantity } = body;

      if (!customerId || !productId || !quantity) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: 'Missing required fields: customerId, productId, quantity',
          }),
        };
      }

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      log('INFO', 'Order created', { orderId, customerId, productId, quantity });

      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Order created successfully',
          orderId,
          env: ENV,
        }),
      };
    }

    if (event.httpMethod === 'GET') {
      log('INFO', 'Fetching orders');

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Orders retrieved successfully',
          orders: [],
          env: ENV,
        }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };

  } catch (error) {
    log('ERROR', 'Unhandled error', { error: String(error) });
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
