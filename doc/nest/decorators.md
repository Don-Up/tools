在 NestJS 中，注解（Decorators）是框架的核心特性之一，用于定义和控制应用程序的行为。以下是一些常用的 NestJS 注解及其用途：

---

### **1. 控制器相关注解**
#### **`@Controller()`**
定义一个控制器类，用于处理路由请求。控制器是处理传入请求和返回响应的地方。每个控制器至少有一个路由，用于确定如何处理客户端请求。
  ```typescript
  @Controller('users')
  export class UsersController {}
  ```

#### **`@Get()`**
定义处理 HTTP GET 请求的路由。GET 请求用于从服务器获取数据。此装饰器通常用于检索资源。
  ```typescript
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

#### **`@Post()`**
定义处理 HTTP POST 请求的路由。POST 请求用于向服务器提交数据以创建新资源。此装饰器通常用于创建资源。
  ```typescript
  @Post()
  create() {
    return 'This action adds a new user';
  }
  ```

#### **`@Put()`**
定义处理 HTTP PUT 请求的路由。PUT 请求用于更新服务器上的现有资源。此装饰器通常用于完全替换资源。
  ```typescript
  @Put(':id')
  update(@Param('id') id: string) {
    return `This action updates user #${id}`;
  }
  ```

#### **`@Delete()`**
定义处理 HTTP DELETE 请求的路由。DELETE 请求用于从服务器删除资源。此装饰器通常用于删除资源。
  ```typescript
  @Delete(':id')
  remove(@Param('id') id: string) {
    return `This action removes user #${id}`;
  }
  ```

#### **`@Patch()`**
定义处理 HTTP PATCH 请求的路由。PATCH 请求用于更新服务器上的现有资源。此装饰器通常用于部分更新资源。
  ```typescript
  @Patch(':id')
  partialUpdate(@Param('id') id: string) {
    return `This action partially updates user #${id}`;
  }
  ```

#### **`@Param()`**
提取路由参数。路由参数是从 URL 中提取的动态值，用于标识特定资源。
  ```typescript
  @Get(':id')
  findOne(@Param('id') id: string) {
    return `This action returns user #${id}`;
  }
  ```

#### **`@Query()`**
提取查询参数。查询参数是从 URL 的查询字符串中提取的键值对，用于过滤或排序资源。
  ```typescript
  @Get()
  findAll(@Query('limit') limit: number) {
    return `This action returns ${limit} users`;
  }
  ```

#### **`@Body()`**
提取请求体数据。请求体数据是从客户端发送的 JSON 或表单数据，用于创建或更新资源。
  ```typescript
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }
  ```

#### **`@Headers()`**
提取请求头数据。请求头数据是从客户端发送的元数据，用于提供关于请求的额外信息。
  ```typescript
  @Get()
  findAll(@Headers('authorization') auth: string) {
    return `Authorization header: ${auth}`;
  }
  ```

#### **`@Req()` 或 `@Request()`**
提取请求对象。请求对象包含所有请求信息，包括请求头、请求体、查询参数等。
  ```typescript
  @Get()
  findAll(@Req() request: Request) {
    return 'This action returns all users';
  }
  ```

#### **`@Res()` 或 `@Response()`**
提取响应对象。响应对象用于设置响应状态码、响应头和响应体。
  ```typescript
  @Get()
  findAll(@Res() response: Response) {
    return response.status(200).send('This action returns all users');
  }
  ```

---

### **2. 提供者相关注解**
#### **`@Injectable()`**
定义一个可注入的类（如服务、仓库等）。可注入类可以通过依赖注入机制在其他类中使用。
  ```typescript
  @Injectable()
  export class UsersService {}
  ```

#### **`@Inject()`**
手动注入依赖。当需要注入的类没有默认提供者时，可以使用此装饰器手动注入依赖。
  ```typescript
  constructor(@Inject('CONNECTION') private connection: Connection) {}
  ```

---

### **3. 模块相关注解**
#### **`@Module()`**
定义一个模块。模块是 NestJS 应用程序的基本构建块，用于组织代码结构和管理依赖关系。
  ```typescript
  @Module({
    controllers: [UsersController],
    providers: [UsersService],
  })
  export class UsersModule {}
  ```

#### **`@Global()`**
将模块标记为全局模块，使其在整个应用中可用。全局模块通常包含提供者，这些提供者可以在任何模块中使用。
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
#### **`@Injectable()`**
定义中间件类。中间件用于在请求处理过程中执行自定义逻辑，如日志记录、身份验证等。
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
#### **`@Catch()`**
定义异常过滤器。异常过滤器用于捕获和处理应用程序中的异常，返回自定义的响应。
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

#### **`@UseFilters()`**
将异常过滤器应用到控制器或路由。通过此装饰器可以为特定的控制器或路由指定异常过滤器。
  ```typescript
  @UseFilters(HttpExceptionFilter)
  @Get()
  findAll() {
    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }
  ```

---

### **6. 管道相关注解**
#### **`@UsePipes()`**
将管道应用到控制器或路由。管道用于在请求处理过程中对数据进行转换和验证。
  ```typescript
  @UsePipes(ValidationPipe)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }
  ```

---

### **7. 守卫相关注解**
#### **`@UseGuards()`**
将守卫应用到控制器或路由。守卫用于在请求处理过程中执行身份验证和授权逻辑。
  ```typescript
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

---

### **8. 拦截器相关注解**
#### **`@UseInterceptors()`**
将拦截器应用到控制器或路由。拦截器用于在请求处理过程中执行自定义逻辑，如日志记录、缓存等。
  ```typescript
  @UseInterceptors(LoggingInterceptor)
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

---

### **9. 自定义元数据相关注解**
#### **`@SetMetadata()`**
为控制器或路由添加自定义元数据。自定义元数据可以用于在运行时获取额外的信息，如权限控制。
  ```typescript
  @SetMetadata('roles', ['admin'])
  @Get()
  findAll() {
    return 'This action returns all users';
  }
  ```

#### **`@ReflectMetadata()`**
为类或方法添加元数据（已弃用，推荐使用 `@SetMetadata`）。

---

### **10. 其他常用注解**
#### **`@Header()`**
设置响应头。响应头用于提供关于响应的额外信息，如缓存控制、内容类型等。
  ```typescript
  @Get()
  @Header('Cache-Control', 'none')
  findAll() {
    return 'This action returns all users';
  }
  ```

#### **`@HttpCode()`**
设置响应状态码。响应状态码用于指示请求的处理结果，如成功、错误等。
  ```typescript
  @Post()
  @HttpCode(204)
  create() {
    return 'This action adds a new user';
  }
  ```

#### **`@Redirect()`**
重定向到指定 URL。重定向用于将客户端重定向到其他 URL，通常用于处理成功操作后的跳转。
  ```typescript
  @Get()
  @Redirect('https://nestjs.com', 301)
  findAll() {
    return 'This action returns all users';
  }
  ```

#### **`@Render()`**
渲染视图模板。视图模板用于生成 HTML 响应，通常与模板引擎一起使用。
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
