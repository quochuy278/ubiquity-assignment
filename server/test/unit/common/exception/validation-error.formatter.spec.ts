import type { ValidationError } from 'class-validator';
import { formatValidationErrors } from '../../../../src/common/exception/validation-error.formatter';

describe('Validation error formatting for diagnostic context', () => {
  it('flattens nested validation failures without retaining submitted values or objects', () => {
    const errors: ValidationError[] = [
      {
        property: 'title',
        value: '',
        target: { title: '' },
        constraints: { isNotEmpty: 'title should not be empty' },
      },
      {
        property: 'assignee',
        children: [
          {
            property: 'email',
            constraints: { isEmail: 'email must be an email' },
          },
        ],
      },
    ];

    expect(formatValidationErrors(errors)).toEqual([
      { field: 'title', messages: ['title should not be empty'] },
      { field: 'assignee.email', messages: ['email must be an email'] },
    ]);
  });
});
