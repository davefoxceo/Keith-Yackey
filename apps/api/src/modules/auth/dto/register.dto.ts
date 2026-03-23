import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum RelationshipStatus {
  MARRIED = 'married',
  ENGAGED = 'engaged',
  DATING = 'dating',
  SEPARATED = 'separated',
  DIVORCED = 'divorced',
}

export class RegisterDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    enum: RelationshipStatus,
    example: RelationshipStatus.MARRIED,
    required: false,
  })
  @IsEnum(RelationshipStatus)
  @IsOptional()
  relationshipStatus?: RelationshipStatus;

  @ApiProperty({ example: 'America/Chicago', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;
}
