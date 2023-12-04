import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Messages } from 'src/constants/messages';
import { MailService } from 'src/mail/mail.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  public async login(userDto: CreateUserDto): Promise<{ token: string }> {
    const user = await this.validateUser(userDto);
    return this.generateToken(user);
  }

  public async registration(
    userDto: CreateUserDto,
  ): Promise<{ message: string; token: string }> {
    const candidate = await this.userService.getUserByEmail(userDto.email);
    if (candidate) {
      throw new HttpException(Messages.USER_EXISTS, HttpStatus.BAD_REQUEST);
    }
    const hashedPassword = await bcrypt.hash(userDto.password, 5);
    const user = await this.userService.createUser({
      ...userDto,
      password: hashedPassword,
    });
    await this.mailService.sendActivationEmail(
      userDto.email,
      user.activationLink,
    );
    const token = await this.generateToken(user);
    return {
      message: Messages.ACTIVATE_YOUR_EMAIL,
      ...token,
    };
  }

  public async activateEmail(
    email: string,
    activationLink: string,
  ): Promise<{
    message: Messages;
  }> {
    await this.userService.activateEmail(activationLink);

    return {
      message: Messages.SUCCESSFUl_ACTIVATION,
    };
  }

  public async forgetPassword(email: string) {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new HttpException(Messages.WRONG_EMAIL, HttpStatus.BAD_REQUEST);
    }

    await this.mailService.sendPassWordResetEmail(email, user.resetToken);

    return {
      message: Messages.RESET_LETTER_SENT,
    };
  }

  public async resetPassword(
    email: string,
    resetToken: string,
    newPassword: ResetPasswordDto,
  ) {
    const user = await this.userService.getUserByEmail(email);

    if (!user || user.resetToken !== resetToken) {
      throw new HttpException(Messages.WRONG_EMAIL, HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(newPassword.newPassword, 5);

    await this.userService.changePassword(email, hashedPassword);

    return {
      message: Messages.SUCCESSFUl_PASSWORD_CHANGE,
    };
  }

  private async generateToken(user: User): Promise<{ token: string }> {
    const payload = { email: user.email, id: user.id };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  private async validateUser(userDto: CreateUserDto): Promise<User> {
    const user = await this.userService.getUserByEmail(userDto.email);
    const passwordEquals = await bcrypt.compare(
      userDto.password,
      user.password,
    );
    if (user && passwordEquals) {
      return user;
    }
    throw new UnauthorizedException({
      message: Messages.INCORRECT_EMAIL_OR_PASSWORD,
    });
  }
}
