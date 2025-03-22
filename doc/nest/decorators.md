在 NestJS 中，注解（Decorators）是框架的核心特性之一，用于定义和控制应用程序的行为。以下是一些常用的 NestJS 注解及其用途：

---

### **1. 控制器相关注解**
- **`@Controller()`**: 定义一个控制器类，用于处理路由请求。
  ```typescript
  @Controller('users')
  export class UsersController {}
  ```

- **`@Get()`**: 定义处理 HTTP GET 请求的路由。
  ```typescript
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

- **`@Post()`**: 定义处理 HTTP POST 请求的路由。
  ```typescript
  @Post()
  create() {
    return 'This action adds a new user';
  }
  ```

- **`@Put()`**: 定义处理 HTTP PUT 请求的路由。
  ```typescript
  @Put(':id')
  update(@Param('id') id: string) {
    return `This action updates user #${id}`;
  }
  ```

- **`@Delete()`**: 定义处理 HTTP DELETE 请求的路由。
  ```typescript
  @Delete(':id')
  remove(@Param('id') id: string) {
    return `This action removes user #${id}`;
  }
  ```

- **`@Patch()`**: 定义处理 HTTP PATCH 请求的路由。
  ```typescript
  @Patch(':id')
  partialUpdate(@Param('id') id: string) {
    return `This action partially updates user #${id}`;
  }
  ```

- **`@Param()`**: 提取路由参数。
  ```typescript
  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns user #${id}`;
  }
  ```

- **`@Query()`**: 提取查询参数。
  ```typescript
  @Get()
  findAll(@Query('limit') limit: number) {
    return `This action returns ${limit} users`;
  }
  ```

- **`@Body()`**: 提取请求体数据。
  ```typescript
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }
  ```

- **`@Headers()`**: 提取请求头数据。
  ```typescript
  @Get()
  findAll(@Headers('authorization') auth: string) {
    return `Authorization header: ${auth}`;
  }
  ```

- **`@Req()` 或 `@Request()`**: 提取请求对象。
  ```typescript
  @Get()
  findAll(@Req() request: Request) {
    return 'This action returns all users';
  }
  ```

- **`@Res()` 或 `@Response()`**: 提取响应对象。
  ```typescript
  @Get()
  findAll(@Res() response: Response) {
    return response.status(200).send('This action returns all users');
  }
  ```

---

### **2. 提供者相关注解**
- **`@Injectable()`**: 定义一个可注入的类（如服务、仓库等）。
  ```typescript
  @Injectable()
  export class UsersService {}
  ```

- **`@Inject()`**: 手动注入依赖。
  ```typescript
  constructor(@Inject('CONNECTION') private connection: Connection) {}
  ```

---

### **3. 模块相关注解**
- **`@Module()`**: 定义一个模块。
  ```typescript
  @Module({
    controllers: [UsersController],
    providers: [UsersService],
  })
  export class UsersModule {}
  ```

- **`@Global()`**: 将模块标记为全局模块，使其在整个应用中可用。
  ```typescript
  @Global()
  @Module({
    providers: [DatabaseService],
    exports: [DatabaseService],
  })
  export class DatabaseModule {}
  ```

---

### **4. 中间件相关注解**
- **`@Injectable()`**: 定义中间件类。
  ```typescript
  @Injectable()
  export class LoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
      console.log('Request...');
      next();
    }
  }
  ```

---

### **5. 异常过滤器相关注解**
- **`@Catch()`**: 定义异常过滤器。
  ```typescript
  @Catch(HttpException)
  export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const status = exception.getStatus();
      response.status(status).json({
        statusCode: status,
        message: exception.message,
      });
    }
  }
  ```

- **`@UseFilters()`**: 将异常过滤器应用到控制器或路由。
  ```typescript
  @UseFilters(HttpExceptionFilter)
  @Get()
  findAll() {
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }
  ```

---

### **6. 管道相关注解**
- **`@UsePipes()`**: 将管道应用到控制器或路由。
  ```typescript
  @UsePipes(ValidationPipe)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }
  ```

---

### **7. 守卫相关注解**
- **`@UseGuards()`**: 将守卫应用到控制器或路由。
  ```typescript
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

---

### **8. 拦截器相关注解**
- **`@UseInterceptors()`**: 将拦截器应用到控制器或路由。
  ```typescript
  @UseInterceptors(LoggingInterceptor)
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

---

### **9. 自定义元数据相关注解**
- **`@SetMetadata()`**: 为控制器或路由添加自定义元数据。
  ```typescript
  @SetMetadata('roles', ['admin'])
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

- **`@ReflectMetadata()`**: 为类或方法添加元数据（已弃用，推荐使用 `@SetMetadata`）。

---

### **10. 其他常用注解**
- **`@Header()`**: 设置响应头。
  ```typescript
  @Get()
  @Header('Cache-Control', 'none')
  findAll() {
    return 'This action returns all users';
  }
  ```

- **`@HttpCode()`**: 设置响应状态码。
  ```typescript
  @Post()
  @HttpCode(204)
  create() {
    return 'This action adds a new user';
  }
  ```

- **`@Redirect()`**: 重定向到指定 URL。
  ```typescript
  @Get()
  @Redirect('https://nestjs.com', 301)
  findAll() {
    return 'This action returns all users';
  }
  ```

- **`@Render()`**: 渲染视图模板。
  ```typescript
  @Get()
  @Render('index')
  findAll() {
    return { message: 'Hello World!' };
  }
  ```

---

### **总结**
NestJS 提供了丰富的注解来简化开发流程，涵盖了路由、依赖注入、异常处理、管道、守卫、拦截器等各个方面。通过合理使用这些注解，可以快速构建高效、可维护的应用程序。