import 'reflect-metadata';
import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false so we control the limit ourselves below
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // 50 MB limit for base64 document uploads; rawBody captured for payment webhook signatures
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Fair-Ride API')
    .setDescription(
      'Logistics & dispatch platform — on-demand, scheduled, and same-day delivery for the Nigerian market.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', 'OTP login and JWT issuance')
    .addTag('users', 'User profiles, business accounts, saved addresses')
    .addTag('riders', 'Rider KYC, GPS, online status, wallet')
    .addTag('orders', 'Create and manage delivery orders')
    .addTag('matching', 'Rider matching and order status updates')
    .addTag('tracking', 'GPS breadcrumb trail per order')
    .addTag('payments', 'Paystack / OPay / cash payment flows')
    .addTag('subscriptions', 'Business and rider subscription plans')
    .addTag('notifications', 'In-app and push notification centre')
    .addTag('chat', 'Order-scoped messaging and call logs')
    .addTag('admin', 'Admin dashboard, management, pricing, promos')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Fair-Ride backend running on port ${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
}
bootstrap();
