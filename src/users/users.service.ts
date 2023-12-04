import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as uuid from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async createUser(dto: CreateUserDto) {
    const user = await this.userRepository.save({
      ...dto,
      activationLink: this.generateActivationLink(),
    });

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.userRepository.find();

    return users;
  }

  // вынести отсюда
  private generateActivationLink(): string {
    const activationLink = uuid.v4();
    return activationLink.toString();
  }
}
