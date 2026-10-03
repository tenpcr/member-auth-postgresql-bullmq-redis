import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { EmailModule } from '@/email/email.module.js';

import { EmailProducer } from '@/queue/email.producer.js';
import { EmailProcessor } from '@/queue/email.processor.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),

    EmailModule,
  ],

  providers: [
    EmailProducer,
    EmailProcessor,
  ],

  exports: [
    EmailProducer,
  ],
})
export class QueueModule {}