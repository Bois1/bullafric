import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private walletService: WalletService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({ ...dto, password: hashed });
    await this.walletService.create(user.id); 
    const token = this.jwtService.sign({ id: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const token = this.jwtService.sign({ id: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, name: user.name }, token };
  }
}