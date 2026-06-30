---
title: '重构'
description: '重构系统，实现热插拔插件系统案'
date: '2026-06-18'
tags: ['ts', 'JavaScript', '工具链']
category: '全栈'
slug: 're5'
draft: false
---

# 重构项目，实现热插拔插件系统

在保证所有功能和UI不变的基础上，无痛重构当前项目，实现热插拔插件系统

## 任务开发

- 请启动应用并打开当前后台页面作为参考，然后开一个新的分支`plugin-dev`一次性完美地完成本阶段这个大工程
- 为了保证当前项目的分支`dev`和新开发`plugin-dev`两个应用都能启动，进行对比参考。你可以用`3003`(前端)和`3002`(后端)的端口去启动新分支的应用

## 验收标准

- 完全符合本文档的插件架构叙述
- 前端开发规则符合`apps/web/AGENTS.md`中的规范
- 完成后，除了增加了一些auth操作（如前台用户注册、后台用户管理等，请参考[插件架构->user插件 -> 新增功能](#新增功能)），请确保整体逻辑业务功能和UI与`dev`这个当前分支一模一样。

## 功能叙述

- 插件目录位于`plugins`，所有插件都可以被安装、卸载、打包、编译、激活和禁用的（请参考[插件架构->cli插件 -> 命令列表][#命令列表]和[插件架构->cli插件 -> 插件命令](#插件命令)）。
- 除了增加了一些auth操作（如前台用户注册、后台用户管理等，请参考[插件架构->user插件 -> 新增功能](#新增功能)）外，插件只是修改架构，不修改当前项目的任何逻辑业务功能和UI界面。不要尝试去修改任何业务功能和UI界面，把现有的功能包装成插件即可
- 所有插件位于`plugins`目录中，每个插件都有个`plugin.yml`配置文件。插件的具体文件结构和`plugin.yml`配置文件中的选项含义，请参考[插件架构->插件定义](#插件定义)
- 已安装插件列表的配置是`data/app.yml`文件中的`plugins`列表
- 当前我建立的所有插件目录仅仅是演示用，具体要通过你来实现

## 插件架构

### 插件命名

插件的包名称为`@3rnew/{插件名}-plugin`，例如，`@3rnew/user-plugin`这个包的插件名称为`user`

### 插件状态

`data/app.yml`中的`plugins`配置显示了当前已安装插件的列表，由一个数组组成。每个数组元素是有name和actived组成。name是插件名称比如`blog`，`actived`是插件激活状态，要么是`true`要么是`false`，没有指定就是`true`。一部分插件因为是核心插件，即使指定`false`也无法禁用，所以不需要这个字段。插件根据上述插件列表获取。默认全部激活即可.其中`config`、`mail`、`sms`、`storage`、`site`、`system`、`cli`、`user`、`rbac`是核心插件，不需要`actived`。插件的激活状态不需要通过环境变量来指定

### 插件定义

使用`pnpm pc`命令创建一个新创建的基础框架的文件架构如下

```bash
├── package.json
├── plugin.yml
├── README.md
├── src
│   ├── api
│   │   ├── constracts
│   │   ├── repositories
│   │   │   └── test.repository.ts
│   │   ├── routes
│   │   │   ├── admin
│   │   │   └── web
│   │   └── services
│   │       └── test.service.ts
│   ├── db
│   │   ├── schema
│   │   └── seeds
│   ├── hook.ts
│   └── types
├── tsconfig.json
└── web
    ├── app
    │   └── admin
    │       ├── _components
    │       └── (pages)
    └── rpc
```

它们的作用为

> ✅表示该文件或该配置或该函数是每个插件必须有的；❎代表该文件或该配置或该函数是根据插件情况可选的

- ✅`plugins/{name}/package.json`: 插件的名称（`@3rnew/plugin`）、版本信息、打包命令、导出文件、依赖信息等
- ✅`plugins/{name}/tsconfig.json`: 插件的typescript配置
- ✅`plugins/{name}/README.md`: 插件的说明文档
- ✅`plugins/{name}/plugin.yml`：插件配置文件，有以下字段
  - ✅`name`：插件展示名称，用于插件管理面板和后台插件信息展示。插件目录名与`data/app.yml`中的插件名仍然作为插件唯一标识
  - ✅`description`：插件功能描述，用于插件管理面板说明插件作用
  - ✅`core`：是否核心插件
  - ❎`api.prefix`：该插件的后端api路由前缀
  - ❎`admin.menus`：该插件后台管理菜单配置
  - ❎`admin.settings`：该插件的”系统设置“面板
  - ❎`admin.breakcrumb`：该插件的后台URL对应的面包屑
  - ❎`stubs`：该插件会复制给前端应用的组件和页面文件。安装时，复制`plugins/{name}/web`目录下对应的stub文件到`apps/web/src`目录同路径下；打包时，复制`apps/web/src`目录下对应的文件到`plugins/{name}/web`目录下的同路径下，并加上`.stub`后缀。支持glob匹配模式
  - ❎`shadcn`：该插件依赖的shadcn组件
  - ❎`rpc`：该插件的客户端调用后端api接口的函数文件
- ❎`plugins/{name}/src/types`：插件的后端和`db`所需的自定义类型
- ❎`plugins/user/src/hook.ts`: 插件钩子，可以自定义在安装插件前、安装插件后、卸载插件前、卸载插件后执行的4个钩子函数
  - ❎`beforeInstall`：插件安装前置钩子
  - ❎`afterInstall`：插件安装后置钩子
  - ❎`beforeRemove`：插件卸载前置钩子
  - ❎`afterRemove`：插件安装后置钩子
- ❎`plugins/{name}/src/db/schema`: 插件的数据结构
- ❎`plugins/{name}/src/db/seeds`: 插件的种子数据文件
- ❎`plugins/{name}/src/api/repositories`: 插件的数据表操作函数
- ❎`plugins/{name}/src/api/services`: 插件的后端逻辑业务操作函数
- ❎`plugins/{name}/src/api/constracts`: 插件的zod验证结构体
- ❎`plugins/user/src/api/routes/admin`: 后台API路由
- ❎`plugins/user/src/api/routes/web`: 前台API路由

### 预定义插件

当前已经定义的插件列表如下（其中部分插件`core: true,`，代表是核心插件，不可卸载，也不能禁用）

```bash
plugins
├── blog # 博客插件
├── config # 配置插件，用于配置queue、db、redis等基础设施。核心插件
├── cli  # cli工具插件。核心插件
├── system # 系统插件。核心插件
├── doc # 文档插件
├── ecommerce # 电商插件
├── mail # 邮件插件。核心插件
├── mdx # mdx插件
├── rbac # 角色与权限（RBAC）插件。核心插件
├── site # 站点插件。核心插件
├── sms # 短信插件。核心插件
├── storage # 云储存插件。核心插件
└── user # 用户插件。核心插件
```

### config插件

config插件实现读取和写入应用配置文件（`data/app.yml`）和每个插件的配置文件（`node_modules/@3rnew/{插件名}/plugin.yml`以及`plugins/{插件名}/plugin.yml`）配置的功能

#### 核心插件

插件配置文件中`core`为`true`的插件为核心插件，也就是

- 这些插件无法卸载
- 这些插件无论在不在`data/app.yml`的`plugins`列表中，无论是不是被激活，都是永远存在且被激活的状态

#### 配置的读写

- 在`plugins/config/src/env.ts`里面编写环境变量获取包，可以把三种环境变量按优先级合并覆盖获取。优先级为：运行命令时指定 > 根目录.env指定 > 操作系统变量
- 在`plugins/config/src/utils.ts`里面编写不同的配置读取函数，用于读取应用配置（数据库连接、redis连接、插件列表等）以及每个插件配置
- 在`plugins/config/src/utils.ts`里面编写不同的配置写入函数，通过操作yaml文件来写入配置文件中的配置
- 应用文件初始化写入
  - database配置：只能单连接。个配置由host(环境变量`DB_HOST`)、port(环境变量`DB_PORT`)、username(环境变量`DB_USERNAME`)、password(环境变量`DB_PASSWORD`)、dbname(环境变量`DB_NAME`)组成。这几个字段既有默认值也可以从获取变量中获取。环境变量优先级大于默认值

- redis配置：支持多连接。有一个默认连接字段`default`用于指定默认的连接name。然后有一个connections数组，数组里的每一项是一个redis连接配置。每个配置由name(第一个连接默认名称就是`default`)、host(环境变量`REDIS_HOST`)、port(环境变量`REDIS_PORT`)、username(环境变量`REDIS_USERNAME`)、password(环境变量`REDIS_PASSWORD`)、dbname(环境变量`REDIS_DBNAME`)、tls(环境变量`REDIS_TLS`)组成。这几个字段既有默认值也可以从获取变量中获取。环境变量优先级大于默认值。环境变量只能指定默认的redis连接，其他的连接需要硬编码指定。暂时配置一个默认连接即可

#### 插件列表获取

在`plugins/config/src/utils.ts`里面编写一个`getPlugins`函数用于读取`data/app.yml`中的所有插件列表

该函数的作用是根据已安装插件列表来通过依赖顺序获取最终每个插件下的`plugin.yml`配置，并形成一个数组。执行逻辑如下

1. 首先，会根据`data/app.yml`中的配置一次性读取这个插件列表
2. 然后，会从第一个插件开始追根溯源每一个插件的依赖，对每个插件的依赖逐层往上查。把每个插件的最顶层依赖插件一直到他自身进行从上往下的按层排序。比如`blog`插件依赖`user`插件、`storage`插件、`mdx`插件；`user`依赖`system`插件、`storage`插件、`mdx`插件依赖`config`；`system`依赖`config`插件；`storage`依赖`config`插件、`system`插件。那么，就形成了`config` -> `system` 、`mdx` -> `storage` -> `user` -> `blog`这么一个排序。为每个插件生成一个依赖排序链
3. 对所有插件的排序链进行分析，形成整个插件的依赖排序链。比如`doc`插件的排序链是:`system`插件的排序链是`config` -> `system` 、`mdx` -> `storage` -> `user` ->`rbac`->`ecommerce`-> `doc`、`blog`插件的排序链是`config` -> `system` 、`mdx` -> `storage` -> `user` -> `blog`。那么，最终的排序链是`config`->`system`->`mdx`->`storage`->`user`->`rbac`->`ecommerce`->`doc`、`blog`。 注意：最终排序链的同级别排序直接根据`data/app.yml`的列表（也就是安装顺序）排序就行
4. 如果读取每一个插件下的`plugin.yml`配置，并按上述顺序进行排序，最终形成一个TS数组。例如：`[{name: 'config',displayName: '配置插件',description: '...',options: {// 这里就是config插件的plugin.yml中的配置}, ...其他插件}]`。其中`name`是插件唯一标识，来自插件目录名或`data/app.yml`；`plugin.yml`中的`name`字段解析为`displayName`，用于展示

再写一个`getPluginNames`函数，调用`getPlugins`函数，得到排序后的插件名数组。例如`['config','system',...其他插件名]`

### cli插件

**该插件依赖config插件**

#### 命令列表

cli插件基于yargs的modules模式开发。为了后续在应用中也可以调用命令，请务必把命令和实现逻辑分开编写

- 在根目录下有一个`cli.sh`，可以使用`./cli.sh`去执行插件内的命令
- 也在根目录下的`package.json`中绑定了这些命令，可以使用`pnpm run`（`run`可以省略）或者`npm run`去执行这些命令

cli插件实现以下命令

- 管理插件
  - 创建插件：`pc {插件名称}`或`plugin:create {插件名称}`
  - 打包插件：`pp {插件名称}`或`plugin:package {插件名称}`
  - 安装插件：`pi {插件名称}`或`plugin:install {插件名称}`
  - 卸载插件：`pr {插件名称}`或`plugin:remove {插件名称}`
  - 禁用插件：`pd {插件名称}`或`plugin:disable {插件名称}`
  - 激活插件：`pa {插件名称}`或`plugin:active {插件名称}`
- 管理迁移：
  - 生成迁移：`dbmg`或`db:migrate:generate`
  - 执行迁移：`dbm`或`db:migrate`
  - 回滚迁移: `dbmb`或`db:migrate:rollback`
  - 填充数据：`ds`或`db:seed`
  - 重置迁移：删除数据库并重新执行所有迁移生成所有数据表。这是个危险操作，只能在开发环境中执行。`dbmr`或`db:migrate:reset`
    - 重置迁移后同时注入种子数据：`dbmr --seed`或`db:migrate:reset --seed`
- 服务启停：
  - 开发环境中：
    - 同时启动前后端应用：`dev`
    - 单独启动前端：`dw`或`dev:web`
    - 单独启动后端: `ds`或`dev:server`
  - 生产环境中：
    - 同时编译前后端和插件：`build`
    - 只编译前端: `bw`或`build:web`
    - 只编译后端: `bs`或`build:server`
    - 只编译插件:
      - 编译所有插件：`bp`或`build:plugin`
      - 编译指定插件：`bp {插件名称}`或`build:plugin {插件名称}`，例如`bp user`
    - 启动前后端：`start`
    - 只启动前端：`sw`或`start:web`
    - 只启动后端：`ss`或`start:server`
  - 停止应用
    - 同时停止前后端应用：`stop`
    - 停止前端：`pw`或`stop:web`
    - 停止后端：`ps`或`stop:server`
- shadcnui组件安装
  - 安装组件：`ui {组件名}`或`ui:install {组件名}`，内部会根据所用的包管理器执行`pnpm dlx shadcn@latest add {组件名} `或`npm dlx shadcn@latest add {组件名} `命令。组件会被安装到`apps/web/src/shadcn`目录中

下面是对以上命令的具体补充说明

#### 插件命令

- 安装插件：使用`pnpm plugin:install {插件名称}`或`./cli.sh plugin:install {插件名称}`命令（也可以使用短命令`pi`）即可安装插件
  - 插件的安装执行流程步骤为
    1. 执行安装命令安装插件
       - 插件名称无需写入带有`@3rnew/`前缀和`-plugin`后缀的整个包名，比如`@3rnew/user-plugin`这个插件，只要使用`pnpm pi user`就能安装
       - 后续插件上线（后面会开发一个插件商店，目前不考虑这个功能）会被安装在`node_modules`目录中。而本地自行开发状态的插件在`plugins`目录中，只是`node_modules`只是会在执行`pnpm i`的时候，自动利用monorepo做个软链接
    2. 把插件作为依赖写入`apps/server/package.json`中。例如`"@3rnew/user-plugin": "workspace:*"`（如果是生产环境，则直接写插件的版本号）
       - 插件安装后，需要自动执行`pnpm i`命令来安装该插件及整个应用的所有依赖
    3. 执行`pnpm i`，安装整个项目的所有依赖以及给所有的插件做上软链接
    4. 执行插件安装前的钩子（如果有的话）
    5. 根据新装的插件中的`src/db/schema`的表结构生成数据文件到`data/migrations`目录中
    6. 执行数据库迁移
    7. 执行种子数据注入
       - 安装时，会询问是否注入初始数据，如果选择`y`则注入，否则略过
       - 运行安装命令时，带上`--seed`或`-s`参数（例如`pi -s`）则跳过询问，直接注入初始数据。反之，如果带上`--no-seed`或`-ns`参数也跳过询问，忽略这步
    8. 执行客户端RPC文件复制：复制`rpc`配置中的配置的客户端orpc连接接口文件(在插件的`web/oprc`目录中)到`apps/web/src/rpc`目录中，并去除`.stub`后缀，以供前端UI调用
    9. 执行前端复制
       - 首先安装插件配置中的所有`shadcn`组件（如果有的话）
       - 在插件安装后，会根据`plugins/{name}/src/stub.yaml`中的配置，把`plugins/{name}/web`目录下用glob匹配出来的文件复制到`apps/web/src`同路径的位置，例如：例如`plugins/blog/web/app/admin/(pages)/blog/categories/index.tsx.stub`会复制为`apps/web/src/app/admin/(pages)/blog/categories/index.tsx`。然后会遍历这些复制过去的文件夹及其子孙文件夹中的文件，把所有文件的`.stub`后缀去除
         - 默认如果某些被复制过去的文件，对应路径下已经存在同名文件，则跳过该文件，而不是直接覆盖
         - 当加上命令参数`--force-override`或`-fo`（如`pnpm pi -fo`）时，即使目标目录下已存在同名文件，也会直接覆盖
    10. 执行插件安装后的钩子（如果有的话）
    11. 把插件写入`data/app.yml`中，并默认激活
    12. 重新编译（开发环境可省略此步骤）
    13. 重启前后端服务
- 卸载插件：使用`pnpm plugin:remove {插件名称}`或`./cli.sh plugin:remove {插件名称}`命令(也可以使用短命令`pr`)即可卸载插件
  - 卸载插件插件的流程是
    1. 执行插件卸载前的钩子（如果有的话）
    2. 从`apps/web/package.json`中移除插件依赖
       - 插件名称无需带有`@3rnew/`前缀和`-plugin`后缀，比如`@3rnew/user-plugin`这个插件，只要使用`pnpm pr user`就能卸载
    3. 数据表删除（根据上述说明判断是否需要删除数据表）
       - 先自动判断是生产环境还是开发环境。为了不破坏已有的数据结构和数据，避免系统损坏，所以，在**生产环境**下，默认不会删除插件的数据表。除非你加了彻底清理参数。参数为`--clear`或`-c`，例如`pr user -c`。而**开发环境**下会直接删除插件的数据表，并重新生成迁移sql文件。然后运行迁移和种子数据生成命令
    4. 前端清理（根据上述说明判断是否需要删除前端）
       - 先自动判断是生产环境还是开发环境。为了不破坏自己写的UI界面，以避免二次开发自行修改插件UI后，卸载导致误删使得自己辛辛苦苦写的UI消失。所以，在**开发环境**下，默认不会删除插件对应的`apps/web/src`中的前端UI文件。除非你加了彻底清理参数。参数为`--clear`或`-c`，例如`pnpm pr user -c`。而生产环境下会根据该插件的`stub.yaml`直接删除，并重新编译前端。
    5. 从`package.json`中删除插件的依赖。然后执行`pnpm i`重新安装一遍依赖
    6. 执行插件卸载后的钩子（如果有的话）
    7. 重新编译（开发环境省略此步骤）
    8. 重启前后端服务
  - 核心插件：凡是配置中`core: true`的插件都是不可卸载的核心插件
- 创建插件：使用`plugin:create {插件名称}`或`./cli.sh plugin:create {插件名称}`命令(也可以使用短命令`pc`)可创建一个新插件。该命令会在`plugins`目录下创建一个以插件名为文件夹名的目录。例如`plugins/user`。目录下默认生成的初始化框架文件参考[插件定义](#插件定义)部分的说明
- 打包插件：使用`pnpm plugin:package {插件名称}`或`./cli.sh plugin:package {插件名称}`命令(也可以使用短命令`pp`)可打包一个插件。
  - 打包前，请确认该插件已经存在在`plugins`目录中
  - 把`plugins/{name}/plugin.yml`中定义的`rpc`配置的客户端orpc连接接口文件从`apps/web/src/rpc`复制到插件的`web/rpc`目录中，并加上`.stub`后缀
  - 把`plugins/{name}/plugin.yml`中定义的`stubs`的前端映射文件从`apps/web/src`中复制到`plugins/{name}/web`目录同路径下，并为每个文件加上`.stub`后缀。如果映射的文件`.tsx`或`.ts`文件有导入模块，那么会一直追根溯源模块到根上。最终，会对被导入的三种不同模块文件做如下处理
    - 导入的模块所属文件如果位于`apps/web/src/app`目录及其子孙目录下。那么，先去遍历所有已安装插件(`node_modules/@3rnew/`下子目录中的`plugin.yml`以及`plugins/`下子目录中`plugin.yml`)，获取这些已安装插件的配置（**注意：请务必自动忽略当前需要打包的插件**）。然后挨个尝试匹配插件配置中的`stubs`配置的映射文件。查看这些有没有那个被导入的模块
      - 如果有，则把匹配到的插件写入当前插件的`package.json`依赖表中
      - 如果一个匹配的插件都没有，则直接略过这个模块的依赖（这证明这个模块是直接写在`apps/web/src/app`里面的）
    - 导入的模块所属文件如果位于`apps/web/src/shadcn`目录的文件中，则直接把这个模块所属的`shadcn`组件名写入插件配置的`shadcn`组件表中
    - 导入的模块如果是`node_modules`模块，则直接把该模块所属的库写入插件的`package.json`依赖表中
  - 复制和插件`web/rpc`
  - 执行`package.json`中的编译命令（在生成插件时，会有自带一个编译命令，也可以自定。产出文件会产出到`dist`中），把产出文件编译出来
    - 每个插件中的`./web`内容无需编译，因为那些是用于复制到应用的前端文件。安装插件时，自动直接复制到应用中的，而不是通过`package.json`导出后被应用导入的文件
- 禁用插件：使用`pnpm plugin:disable {插件名称}`或`./cli.sh plugin:disable {插件名称}`(也可以使用短命令`pd`)命令禁用一个插件。
  - 注意；插件激活和禁用功能只涉及页面和后端api的访问，不涉及数据库
  - 禁用插件后，会在`data/app.yml`中把这个插件的`actived`改成`false`。如果这个插件配置中的`core`为`true`，则证明它是一个核心插件，无法被禁用。所以不会改变其`actived`值。
  - 在next.js中间件`apps/web/src/proxy.ts`中会通过config插件读取被禁用的插件，然后遍历这些插件配置中的`stubs`映射的页面。当访问到这些页面时，直接返回404。同时，system插件后端api实例构建函数中也会有个hono中间件，遍历被禁用插件配置中的`api.prefix`的api前缀。当访问这些前缀的api时，也会返回404
  - 因为核心插件无法被禁用，所有在遍历被禁用的插件的配置时，如果发现这些插件的`core`配置是`true`，但也不小心被禁用了，那么，并不会真正的禁用
- 启用插件：使用`pnpm plugin:active {插件名称}`或`./cli.sh plugin:active {插件名称}`(也可以使用短命令`pa`)命令禁用一个插件。
  - 注意；插件激活和禁用功能只涉及页面和后端api的访问，不涉及数据库
  - 会在`data/app.yml`中把这个插件的`actived`改成`true`。如果这个插件配置中的`core`为`true`，则证明它是一个核心插件，无法被禁用或激活。所以不会改变其`actived`值。
  - 在next.js中间件`apps/web/src/proxy.ts`中会通过config插件读取被禁用的插件，然后遍历这些插件配置中的`stubs`映射的页面。当访问页面时，如果页面不在被禁用插件的`stubs`列表中或者是核心插件页面则放行，继续访问。同时，system插件后端api实例构建中也会有个hono中间件，遍历被禁用插件和核心配置中的`api.prefix`的api前缀。当访问api时，如果访问的路由前缀不在被禁用插件的路由前缀列表或者是核心插件路由前缀，则放行

#### 迁移命令

- 迁移管理命令遵循以下规则
  - 在执行命令前，先通过config插件读取`data/app.yml`中关于数据库的配置，拼装车drizzle数据库配置
  - 生成迁移、执行迁移、执行种子数据填充、回滚迁移等命令的参数要和drizzle一一对应。例如，可以添加`--name`参数，用于自定义生成的迁移名称

- 生成迁移: 使用`dbmg`或`db:migrate:generate`命令来生成迁移
  - 遍历所有插件中的`src/db/schema`目录中的drizzle模型定义，然后根据这些模型变化生成新的迁移
  - 所有生成的迁移文件均统一放在根目录下的`data/migrations`目录中
- 执行迁移：使用`dbm`或`db:migrate`执行`data/migrations`目录中的所有迁移，也可以指定某个迁移文件执行
- 滚回迁移：使用 `dbmb`或`db:migrate:rollback`命令指定`data/migrations`中某个迁移回滚迁移。如果不指定，则默认回滚到上一次迁移
- 填充数据：使用`ds`或`db:seed`命令会填充种子数据，具体步骤是
  - 理清所有插件之间的依赖关系，并按依赖自动组成一个填充数据执行表。例如`rbac`插件依赖`user`插件，则会先执行`user`插件的填充数据
  - 填充数据会按顺序，依次加载每个插件中的`db/seeds`中的`index.ts`文件，导入这个文件中的`runSeed`执行
  - 如果在命令后面加上`--truncate`或`-t`参数，则会按插件依赖关系的反向顺序，根据每个插件`src/db/schema`目录中定义的模型对应的数据表来清空这些数据表的数据。然后在按插件依赖的正向顺序去填充数据
    - 为了数据安全，这个参数只在开发环境下才有效，生产环境下是无效的
- 重置数据库：使用`dbmr`或`db:migrate:reset`重置数据库
  - 该命令用于直接删除所有数据表，清空数据库，然后重新执行`data/migrations`目录中的所有迁移生成表结构
  - 为了数据安全，该命令只能在开发环境下执行
  - 加上`--seed`或`-s`参数，可以在重新在重新生成表结构后执行填充命令填充种子数据

#### 服务启停

- 应用启动说明
  - 应用启动始终需要保持当前基础架构[better-t-stack](https://www.better-t-stack.dev/)的tui
  - 生产环境中是静默启动的，而开发环境中是非静默启动
  - 在开发环境中，使用`dev`命令可以一键启动前后端双应用。也可以使用`dw`或`dev:web`命令单独启动前端； `ds`或`dev:server`命令单独启动后端
  - 在生产环境中，使用`stop`命令可以一键启动前后端双应用。也可以使用`sw`或`start:web`命令单独启动前端； `ss`或`start:server`命令单独启动后端
  - 默认前端启动端口是`3001`，后端启动端口是`3000`
  - 当使用`dev`或`start`一次性启动前后端应用时，可以通过命令参数`--port-web`或`-pw`来指定前端启动端口，`--port-server`或`-ps`指定后端端口
  - 当使用`dev:web`（或`dw`）或`start:web`（或`sw`）启动前端应用时，可以通过命令参数`--port`或`-p`来指定前端应用端口
  - 当使用`dev:server`（或`ds`）或`start:server`（或`ss`）启动后端应用时，可以通过命令参数`--port`或`-p`来指定后端应用端口
  - 也可以通过在`.env`中通过定义环境变量的方式定义端口。`APP_WEB_PORT`来定义前端启动端口,`APP_SERVER_POST`定义后端端口
  - 启动命令的端口设置优先级判断顺序为：命令参数 > 环境变量 > 默认端口
  - 同时，所有启动命令还可以通过`--host`、`-h`以及环境变量`APP_HOST`来指定启动应用的主机服务器IP或域名。默认是`127.0.0.1`
- 应用停止说明
  - 停止命令的原理是根据端口来彻底杀死对应的应用进程
  - 在开发环境中，可以在启动应用的窗口中，通过`ctrl+c`来关闭应用。当然，也可以在其他任意的cli中通过该命令来关闭应用
  - 使用`stop`命令可以一键停止前后端双应用。也可以使用`pw`或`stop:web`命令单独停止前端； `ps`或`stop:server`命令单独停止后端
  - 当使用`stop`一次性停止前后端应用时，可以通过命令参数`--port-web`或`-pw`来指定前端停止端口，`--port-server`或`-ps`指定后端端口
  - `stop:web`（或`pw`）停止前端应用时，可以通过命令参数`--port`或`-p`来指定前端应用端口
  - `stop:server`（或`ps`）停止后端应用时，可以通过命令参数`--port`或`-p`来指定后端应用端口
  - 如果没有通过参数指定停止端口则停止命令
    - 首先会尝试读取环境变量定义文件`.env`中定义的端口，如果有定义则停止环境变量中定义端口的应用
    - 如果没有定义，那么会命令关闭`3000`和`3001`端口的应用进程
  - 停止命令的端口优先级判断顺序为：命令参数 > 环境变量 > 默认端口
- 前端如何确定后端接口地址
  - 整体启动命令、单独前端启动命令都有一个参数`--server-url`或`-su`专门指定后端API服务器地址。如果指定了该参数，那么，前端将访问该参数指定的后端api地址
  - 如果`.env`环境变量通过`NEXT_PUBLIC_API_URL`环境指定了后端地址，则该地址作为当前应用的API后端地址
  - 如果参数和环境变量都没有指定，那么，默认访问`${host}:${后端启动端口}`

### system插件

**该插件依赖config插件**

#### 后端实例

以下是系统插件的功能描述

- 后端api实例构建函数用于创建api实例，定义在`plugins/system/src/utils/api.ts`（架设把其命名为`buildAPI`）
  - 该函数会根据传入的插件列表中每个插件的后端路由前缀及路由表、中间件构建起一个后端实例
    - 包含后端路由表
    - cors
    - 一些必要的中间件
    - 404返回
    - openapi数据
    - `/doc`生成[saturn](https://docs.saturnbtc.io/)文档地址
    - 整体oprc api
  - 在`apps/server/src/index.ts`中调用`buildAPI`传入所有插件中的配置和路由以及中间件等，并使用该实例启动服务器，释出orpc接口供前端调用

#### 后台面板

后台面板框架在system插件中编写

- 整体布局写在`plugins/system/web/app/admin/_components/layout/index.tsx.stub`中，在插件安装时，会复制为`apps/web/src/app/admin/_components/layout/index.tsx`

- 用户菜单：由于后台面板是system插件构建的，此插件并不依赖user插件，因此默认是没有用户菜单的。所以，请在`plugins/system/web/app/admin/_components/layout/sidebar/index.tsx.stub`中预留一个用户菜单槽位。在安装user插件后，user插件会复制`plugins/user/web/app/admin/_components/layout/sidebar/user.tsx.stub`到`apps/web/src/app/admin/_components/layout/sidebar/user-action.tsx`。然后会自动修改`sidebar/index.tsx`并导入`user-action`，最后，把`user-action`这个组件放到槽位位置
- 后台菜单
  - 一个菜单组或菜单项必须属于一个菜单合集
  - 菜单配置：每个插件的后台菜单配置写在插件的`plugin.yml`的`admin.menus`中
    - 菜单分为：菜单合集、菜单组和菜单项三种；设置`collection: true`代表当前菜单式菜单合集（例如"内容管理"）；菜单配置中没有`path`选项则代表当前菜单是菜单组（例如：“博客管理”）；当菜单配置中有`path`选项时，代表当前菜单是菜单项（例如：“文章管理”）
    - `children`：子菜单数组，只有菜单合集和菜单组可以配置此选项
    - `path`：菜单链接，只有菜单项有此选项
    - `icon`：菜单图标，只有菜单组和菜单项可以配置此选项
    - `name`（必填）：菜单名称
    - `order`：菜单排序
  - 菜单数据: 在`plugins/system/web/app/admin/utils/menus.ts.stub`编写一个菜单数据获取函数
  - 菜单排序：
    - 如果菜单配置中有`order`选项，则根据该选项进行排序。否则`order`默认为`0`
    - 当多个插件的菜单配置中都配置了一个同名的合集，则会根据config插件中`getPlugin`的插件排序先得出第一个配置了这个合集的插件。如果这个插件没有指定该菜单合集的`order`。那么，在依次从第二个、第三个插件中查找该菜单合集的`order`。直到第一次找到该菜单合集的`order`为止。这个`order`就是该菜单合集的排序。如果一直没找到，那么，默认这个菜单合集的`order`就是`0`。如果有几个菜单合集的`order`都是`0`或者相同的`order`，那么，排序会根据第一次发现那些菜单合集的插件的排序进行排序
    - 菜单组的排序也一样：遍历所有插件后，如果在不同插件的同一个合集里发现了同一个菜单组。那么，如果多个菜单组都指定了`order`，就按`order`顺序来排序；没有指定`order`的默认就是`0`；如果`order`相同，则根据`getPlugins`中的插件依赖顺序进行排序
    - 菜单项的排序：因为同一个菜单合集的同一个菜单组中的同名菜单项或者同一个菜单合集下的同名独立菜单项必须是唯一的。所以，如果指定了`order`则按`order`排序；没指定默认就是`0`；如果`order`相同，则根据`getPlugins`中的插件依赖顺序进行排序
  - 菜单渲染：
    - 在`plugins/system/web/app/admin/_components/layout/sidebar/menu.tsx.stub`中渲染菜单
    - 菜单项的图标只有在其为菜单合集下的独立菜单项时，才会被显示。如果是菜单组中的菜单项，则不显示图标
- 面包屑：
  - 插件的面包屑配置
    - `names`：面包屑名称数组
      - 数组元素可以是一个字符串或者一个由`text`以及`link`组成的链接
    - `match`：面包屑匹配URL
  - 在`plugins/system/web/app/admin/utils/breadcrumb.ts.stub`编写一个面包屑数据获取函数。调用config插件中的`getPlugins`函数获取所有插件配置中的`breakcrumb`配置，并组合成一个面包屑数组
  - 该函数的执行逻辑为
    1. 获取所有插件中的面包屑配置
  2. 然后在`plugins/system/web/app/admin/_components/layout/header/breadcrumb.tsx.stub`会中会调用该函数，传入当前的url给该函数，分析出面包屑。该函数会根据传入的URL依次匹配出符合当前URL的面包屑，例如: `['用户与权限',[text: '用户管理', link: '/admin/users','编辑用户']]`
  - 最终，在`plugins/system/web/app/admin/_components/layout/header/breadcrumb.tsx.stub`中渲染当前面包屑。渲染规则为
    - 例如上述面包屑的文字为：`{home图标} > 用户与权限 > 用户管理 > 编辑用户`
    - 在面包屑的最前面加上一个`home`图标的返回后台首页的图标链接
    - 如果有中间部分（例如`用户与权限 > 用户管理`），那么中间部分的某个项有链接则加上链接。比如`用户管理`需要加上`link`的值为`/admin/users`
    - 最后一项，也就是当前页面，无论有没有配置`link`，都不要加上链接，直接文字显示即可

- 系统设置：在`plugins/system/web/app/admin/utils/settings.ts`中编写一个函数用于获取所有已安装插件中挂钩“系统设置”的面板`tabs`组件的选项卡数据，如图
  ![](https://cn-nb1.rains3.com/3rcd/media/1778350577133.png)。该函数的执行逻辑
  - 首先，调用config插件的`getPlugins`获取每个插件中的`settings`配置。该配置的字段
    - `name`：选项卡显示的名称文字
    - `path`：选项卡路径（渲染时，会自动加上`/admin/settings`前缀）
  - 如果根据它们的`order`配置进行排序
  - 获取选项卡数组并根据`order`排序，排序后去除`order`后返回这个数组。例如`[{name: '站点信息', path: 'user'},{name: '云储存设置', path: 'storage'},//其他选项卡]`
  - 渲染面板
    - 在`plugins/system/web/app/admin/_components/settings/tabs.tsx.stub`中根据上面获取到的选项卡数据渲染选项卡（渲染时，需要自动为`path`字段加上`/admin/settings`前缀）
    - 在`plugins/system/web/app/admin/_components/settings/layout.tsx.stub`中导入该选项卡，并且`plugins/system/web/app/admin/(pages)/settings/layout.tsx.stub`中加载该布局组件
    - 每个插件会在`install`时，把各自的后台设置页面复制到`apps/web/src/app/admin/(pages)/settings`目录中，就能渲染了
  - 其它页面
    - 后台仪表盘
    - 后台运维监控
    - 后台图标管理
  - 在`plugins/system/src/utils/jobs`中，整合bullmq实现消息列队功能。消息列队的redis连接可以在sms、mail等插件插件创建任务时，根据config插件中配置的redis名称传入，而不是直接传入redis实例。列队创建函数会自动使用config插件根据名称获取redis配置。如果不传入redis连接名称，则使用默认redis连接配置

### user插件

#### 用户认证

- 所有AUTH操作（注册用户、认证用户、找回密码等）的底层实现实现都使用[better-auth](https://better-auth.com/)库
- [better-auth](https://better-auth.com/)库仅提供`createAuth()`函数调用其`betterAuth`整合`drizzle`进行底层认证处理，但后端api是使用Hono+orpc构建的。这些auth认证的代码位置如下
  - `plugins/user/src/api/services/auth.service.ts`: 负责调用`createAuth()`实现auth操作
    - 用户注册、注册验证邮件发送、注册验证短信发送、注册欢迎邮件发送
    - 用户登录
    - 找回密码、找回密码验证邮件发送、找回密码验证短信发送
  - `plugins/user/src/api/routes/admin/auth.ts`: 提供`auth`的后台认证接口（管理员用户登录）
  - `plugins/user/src/api/routes/web/auth.ts`: 提供`auth`的前台认证接口（用户注册、用户登录、找回密码及短信和邮件发送）
- 后台用户菜单：由于后台面板是system插件构建的，此插件并不依赖user插件。所以，默认是没有用户菜单的。所以，需要在`plugins/user/src/hook.ts`中写一个安装插件后的钩子函数（`afterInstall`），把`plugins/user/web/app/admin/_components/layout/sidebar/user-action.tsx.stub`复制到应用中。然后修改`apps/web/src/app/admin/_components/layout/sidebar/index.tsx`文件导入该组件，并把该组件放到`sidebar/index.tsx`预留的用户菜单槽位中

#### 认证保护

- 前端中间件：当前是使用在布局页面里面判断用户登录的方式对页面进行保护验证的。
  - 现在需要调整为通过`apps/web/src/proxy.ts`对前端访问进行认证保护
  - 编写一个`plugins/user/web/proxy.ts.stub`，调用better-auth客户端，对用户前端访问进行保护
  - 修改上述安装插件后的钩子函数（`afterInstall`），加上新的业务逻辑：检测`apps/web/src/proxy.ts`中的代码，如果未发现认证保护功能，则无论执行的user插件安装命令时，是否带有强制覆盖参数(`--force-override`或`-fo`)，都会把`plugins/user/web/proxy.ts.stub`强制覆盖到`apps/web/src/proxy.ts`
- 后端中间件：用户认证中间件编写在`plugins/user/src/api/middleware.ts`中。这样，其它插件在需要用户认证保护的后端路由上套上该中间件就能对路由进行用户认证保护了

#### 新增功能

以下功能时当前项目没有的，你需要新增

- 实现后台用户管理: `plugins/user/web/app/admin/(pages)/users`
- 实现前台auth操作: `plugins/user/web/app/web/user/auth`

### 其它插件

除了上述详细描述的`config`、`cli`、`system`、`user`等4个插件外，其它插件保持和当前应用的功能一致，不做任何改动，仅做成插件就行。它们的功能如下

- 站点插件：后台导航管理、后台友链分类和友链管理
- 短信插件：后台短信配置和短信发送
- 邮件插件：后台邮件配置和邮件发送
- 云存储插件：后台本地存储和云存储的配置、文件管理
- mdx插件：markdown和mdx的编辑器与渲染
- RBAC插件：和当前一样，目前不需要实现。仅后台支持空白页+居中标题文字替代即可
  - 后台角色的管理空白页
  - 后台权限的查看空白页

- 电商插件：目前只需要保持已经开发完毕的支付配置功能即可
- 博客插件：
  - 后台博客分类管理
  - 后台博客文章管理
  - 后台博客评论管理
  - 后台博客标签管理

- 文档插件：和当前一样，目前不需要实现。仅后台支持空白页+居中标题文字替代即可
  - 后台知识库管理的管理空白页
  - 后台文档管理的管理空白页
  - 后台标签管理的管理空白页

### 依赖关系

在创建插件时，自动写入该插件的依赖到`package.json`。预定义插件之间的依赖关系为

> 部分插件是相互依赖的

- cli插件依赖: config
- system插件依赖: config
- user插件依赖：system、sms、mail、storage、rbac
- rbac插件依赖：user
- sms插件依赖：user、rbac
- mail插件依赖：user、rbac
- storage插件依赖：user、rbac
- mdx插件依赖：user、rbac、storage
- blog插件依赖：storage、mdx、user、rbac
- site插件依赖：user、rbac、storage
- doc插件依赖：ecommerce、storage、mdx、user、brac
- ecommerce插件依赖：user、rbac、storage、mail、sms

## 实现步骤

我建议具体按以下步骤实现

1. 把`packages`目录移动到`back`目录里，而不是直接删除，以供后续参考当前实现的逻辑业务功能和复制UI样式及前端代码
2. 把当前的`plugins`目录移动到`back`目录里，而不是直接删除，以供后续参考插件结构样板。但千万不要直接套用，你更应该是根据本文档详细叙事来开发
3. 重新创建`plugins`，创建所有[预定义插件](#预定义插件)目录。统一为所有插件编写`tsconfig.json`、`package.json`、`plugin.yml`、`README.md`
4. 处理`package.json`之中的各个插件的[依赖关系](#依赖关系)
5. 把`packages/ui`这个shadcn组件库里的文件和代码迁移到应用中，以后都使用应用中的`apps/web/src/shadcn`目录和`apps/web/components.json`配置来使用shadcn。这个独立的累赘包不再需要
6. 在`package.json`的`workspaces`中把`packages/*`改成`plugins/*`；`pnpm-workspace.yaml`的`packages`做同样的修改
7. 清空`data/app.yml`中的插件列表，开发完[cli插件](#config插件)再增加
8. 实现[config插件](#config插件)
9. 实现[cli插件](#config插件)，并同时编写根目录下的`cli.sh`和`package.json`使他们能执行cli插件中的[所有命令](#命令列表)
10. 执行[打包命令](#命令列表)，编译并打包config插件和cli插件
11. 执行安装命令，安装config插件和cli插件
12. 由于cli和config是核心插件安不安装无所谓，但是为了插件列表清单更加清晰并且做一下打包和安装的测试，所以做了第9和第10步。后续所有插件实现后，都执行这两步
13. 实现[system插件](#config插件)：前端部分先在`apps/web`中写好，确认没问题，执行[cli插件](#cli插件)的[打包命令](#命令列表)以测试把前端文件到插件的`plugins/system/web`中并修改为`.stub`后缀的实现
14. 实现[user插件](#user插件)并打包安装
15. 实现[rbac插件](#依赖关系)](#user插件)并打包安装
16. 实现[site插件](#依赖关系)并打包安装
17. 实现[sms插件](#依赖关系)并打包安装
18. 实现[mail插件](#依赖关系)并打包安装
19. 实现[storage](#依赖关系)插件并打包安装
20. 实现[mdx插件](#依赖关系)并打包安装
21. 实现[ecommerce插件](#依赖关系)并打包安装
22. 实现[blog插件](#依赖关系)并打包安装
23. 实现[doc插件](#依赖关系)并打包安装
