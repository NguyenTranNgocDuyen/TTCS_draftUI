// google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { escapeIdentifier } from 'pg';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID') || '311366338059-897jebqt06eb2l4hiqp6o5rrb3885p43.apps.googleusercontent.com',
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET') || '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',
      callbackURL: configService.get('PORT') ? `http://localhost:${configService.get('PORT')}/auth/google-redirect` : 'http://localhost:3000/auth/google-redirect',
      scope: ['email', 'profile'],
      passReqToCallback : true
    });
  }

  async validate(req : any ,accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) {
    const { name, emails, photos, id } = profile;
    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
    };
    done(null, user);
  }
}