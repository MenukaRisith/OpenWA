import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendBulkMessageDto } from './bulk-message.dto';

describe('SendBulkMessageDto', () => {
  it('accepts text bulk messages with template variables under whitelist validation', async () => {
    const dto = plainToInstance(SendBulkMessageDto, {
      batchId: 'promo-test',
      messages: [
        {
          chatId: '94719089448@c.us',
          type: 'text',
          content: {
            text: 'Hi {name}, this is a test promotion from Aeon.',
          },
          variables: {
            name: 'Menuka',
          },
        },
      ],
      options: {
        delayBetweenMessages: 3000,
        randomizeDelay: true,
        stopOnError: false,
      },
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual([]);
  });

});
