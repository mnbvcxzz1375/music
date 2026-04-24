declare module 'express' {
  interface Request {
    body?: any;
    params?: any;
    query?: any;
    headers?: any;
    user?: any;
  }
  interface Response {
    status?: (code: number) => this;
    json?: (body: any) => this;
    send?: (body: any) => this;
  }
  interface NextFunction {
    (err?: any): void;
  }
  type Next = NextFunction;
  interface Router {
    get(path: string, ...handlers: any[]): Router;
    post(path: string, ...handlers: any[]): Router;
    put(path: string, ...handlers: any[]): Router;
    delete(path: string, ...handlers: any[]): Router;
    use(middleware: any): Router;
  }
  interface Application {
    use(middleware: any): Application;
    listen(port: number, callback?: () => void): Application;
    set(setting: string, value: any): Application;
  }
  function json(): any;
  function static(root: string): any;
  function Router(): Router;
  function Application(): Application;
  const e: Application;
  export default e;
}

declare module 'cors' {
  interface CorsOptions {
    origin?: string | boolean | RegExp | Array<string | RegExp>;
    methods?: string | string[];
    allowedHeaders?: string | string[];
    credentials?: boolean;
  }
  function cors(options?: CorsOptions): any;
  export default cors;
}

declare module 'helmet' {
  interface HelmetOptions {
    contentSecurityPolicy?: any;
    crossOriginEmbedderPolicy?: any;
    crossOriginOpenerPolicy?: any;
    crossOriginResourcePolicy?: any;
  }
  function helmet(options?: HelmetOptions): any;
  export default helmet;
}

declare module 'express-rate-limit' {
  interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string;
    statusCode?: number;
  }
  function rateLimit(options?: RateLimitOptions): any;
  export default rateLimit;
}

declare module 'jsonwebtoken' {
  interface SignOptions {
    expiresIn?: string | number;
    algorithm?: string;
  }
  interface VerifyOptions {
    algorithm?: string;
  }
  interface DecodeOptions {
    complete?: boolean;
  }
  function sign(payload: any, secret: string, options?: SignOptions): string;
  function verify(token: string, secret: string, options?: VerifyOptions): any;
  function decode(token: string, options?: DecodeOptions): any;
  export default { sign, verify, decode };
}

declare module 'bcryptjs' {
  function hash(password: string, saltRounds: number): Promise<string>;
  function compare(password: string, hashedPassword: string): Promise<boolean>;
  function genSalt(saltRounds?: number): Promise<string>;
  export default { hash, compare, genSalt };
}

declare module 'stripe' {
  interface StripeConfig {
    apiVersion?: string;
  }
  interface Stripe {
    customers: any;
    subscriptions: any;
    paymentIntents: any;
    invoices: any;
  }
  function Stripe(secretKey: string, config?: StripeConfig): Stripe;
  export default Stripe;
}