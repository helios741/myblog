使用ts写React代码写了将近三个月，从刚开始觉得特别垃圾到现在觉得没有ts不行的一些实践以及思考。
如果按部就班的写React就体会不到使用ts的乐趣，如果多对代码进行优化，进行重构，在业务中实践比较好的一些方案就会体会到ts真正的乐趣，但是ts也在过程中给我带来了痛苦，在本文的最后会具体展开一下。

## 使用ts的心态变化


刚开始觉得ts好垃圾，觉得React的`PropType`和`PropDefault`几乎能做ts的静态类型检查能做到的事情，甚至做的还能比ts做的多。比如说对于组件间设置默认值，ts对于支持的就是不太好。


后来由于一个需求我改变了一点我的想法，当时的想法就是：“你还别说，这个ts还有点用”。这个场景分为两种情况：
1. 父组件传递子组件的参数名要发生变化，按照以前都是要通过`commamd(ctrl) + f`的方式去全局搜索并且修改，但是这样还是如果对于量大话就很不友好（我遇到的就是量大的情况），如果统一替换的话，比如说这个变量叫做user，就有很大概率会包含其他的变量，这样统一替换就会很尴尬。但是ts的静态类型检查就帮你解决了这个问题，对于每一个父组件没有传递的值来说，都会提示错误。而且ts的**报错是在编译时，不是在运行时**。
2. 但是如果传递的参数名不变，参数值变了的话，ts的静态类型也会帮你检查出来，然后开发人员再去做修改。说了这些比较抽象，上个示例代码比较清晰：

```typescript
// 父组件
render(): ReactNode {
    const { user, loading, namespaceList, yarnList, workspace } = this.state;
    return (
      <UserDetail
        user={user}
        loading={loading}
        namespaceList={namespaceList}
        yarnList={yarnList}
        workspace={workspace}
        onLoadWorkspace={(params: IParams) => this.onLoadWorkspace(params)}
        onUpdateUser={(field: string, data: IUserBaseInfo) => this.handleUpdateUser(field, data)}
        onToCreateAk={(userId: number) => this.handleToCreateAk(userId)}
        onDelete={(ids: number[]) => this.handleDelete(ids)}
        onUpdateResource={(userId: number, data: IResources) => this.onUpdateResource(userId, data)}
        onAkDelete={(ak: IPermanentKey) => this.handleDeleteAk(ak)}
        onChangeAkStatus={(ak: IPermanentKey, status: string) => this.onChangeAkStatus(ak, status)}
      />
    );
  }
```

只要注意第一个参数就可以了，这个是实际的业务场景，下面是子组件：

```typescript
export interface IProps {
  user: IUser | null;
  loading: boolean;
  namespaceList: { namespace: string }[];
  yarnList: IYarn[];
  workspace: {
    list: IWorkspace[] | null,
    total: number,
  } | null;
  onLoadWorkspace: (params: IParams) => void;
  onUpdateUser: (field: string, data: IUserBaseInfo) => void;
  onToCreateAk: (userId: number) => void;
  onDelete: (ids: number[]) => void;
  onUpdateResource: (userId: number, data: IResources) => void;
  onAkDelete: (ak: IPermanentKey) => void;
  onChangeAkStatus: (ak: IPermanentKey, status: string) => void;
}

class UserDetail extends Form<IProps, {}> {
}
```


看，如果这样写的话，就能覆盖住上面的两种情况了。


当我硬着头皮准备去修改同事上千行的React代码时候，我刚开始犹豫了好长时间，怕赶在上线发版之前搞不完之类的，后来实践的时候发现意淫的有点多了，有了ts不用关心这么多了呀。大致为父组件给子组件传递的值和回调定义好就ok了。这么说可能有点宽泛，好像自己写一个组件也是这样的，哈哈。后面会具体的提到怎么使用ts重构的。这个时候对于ts的心态就是：“这个东西是真的厉害”。

经历了几次重构自己和重构其他人代码的时候，我现在对于ts的心态就是：“我可能以后的前端生涯离不开这玩意儿了”。


## 项目架构


因为在网上能搜到的`ts+react`的项目还是比较少，真实的实践也是比较少，都是一些从头开始配置项目的。文件的目录结构怎么做比较好还是没有具体的实践方案。当然，这种方案还是要根据具体的业务来分析的。在上一篇文章[编写不用redux的React代码](https://github.com/helios741/myblog/issues/21)中说明我当前遇到的业务场景。

最终决定把所有的**interface**都放在**公用的schemas目录**然后在具体的业务中进行具体引用。
具体的common的目录结构如下(schems目录下面就保存着所有的接口信息)：
```markdown
common
├── component
│   ├── delete-workspace-modal
│   │   ├── delete-workspace-modal.less
│   │   ├── delete-workspace-modal.less.d.ts
│   │   └── index.tsx
│   └── step-complete
│       ├── index.tsx
│       ├── step-complete.less
│       └── step-complete.less.d.ts
├── css
│   └── global.less
├── hoc
│   ├── workspace-detail.tsx
│   └── workspace-list.tsx
├── schemas
│   ├── dialog.ts
│   ├── k8s.ts
│   ├── ldap.ts
│   ├── message.ts
│   ├── params.ts
│   ├── password.ts
│   ├── section.ts
│   ├── table.ts
│   ├── user.ts
│   ├── workspace.ts
│   └── yarn.ts
└── util
    ├── field-value.ts
    ├── format-datetime.ts
    ├── genURL.ts
    ├── getNamespaceList.ts
    ├── getYarnList.ts
    └── validation.ts
```

在schems目录下面的文件就类似于通用的静态类型，和业务相关但并不是和某个模块进行强绑定，这是因为在每个模块之间难免会遇到一些交叉。下面是某个具体模块的静态类型：

```typescript
export interface IYarnResource {
  id: number;
  namespace: string;
  user: string;
  queue: string;
}

export interface IYarnStatus {
  name: string;
  error: string;
  maxCapacity: number;
  state: string;
  used: number;
  capacity: number;
}

export interface IYarnEntity extends IYarnResource {
  status: IYarnStatus;
  keytab: string;
}
```


和模块强耦合的静态类型比如说**props**和**state**的静态类型，都会放在绝体的业务文件中，就比如说下面的这个代码（简化后）：
```typescript
import React, { PureComponent, ReactNode, Fragment } from 'react';
import { IComplex } from 'common/schemas/password';
export interface IProps {
  onClose(): void;
  onOK(data: IComplex): void;
  complex: IComplex | null;
}
export interface IState extends IComplex {
}
class PasswordComplex extends PureComponent<IProps, IState> {
    state: IState = {
    leastLength: 6,
    needCapitalLetter: false,
    needLowercaseLetter: false,
    needNumber: false,
    needSpecialCharacter: false,
  };
}
```
所有的业务静态类型一般都是不可复用的，一般是通用静态类型以及某些特殊的静态类型组合而成的。

state的初始化不一定要放在`constructor`里面，但是一定要给state指定类型，具体的原因见：[Typescript in React: State will not be placed in the constructor will cause an error](https://stackoverflow.com/questions/52378283/typescript-in-react-state-will-not-be-placed-in-the-constructor-will-cause-an-e)

## 具体静态类型实践

如果我们安装了`@types/react`，在react目录下的`index.d.ts`会有react的所有静态类型定义。

### 具体组件架构

现在比如写一个模块叫用户管理，里面包含**查看用户详情**，**查看用户列表**，**新建用户**等功能。这也就对应这三个路由`/users/:id`，`/users`，`/users/create`。这也就对应着三个有状态组件分别为：`user-detail-wrapper`, `user-list-wrapper`,`user-form-wrappper`。有状态组件里面只是请求或者获取数据之类的。展示是通过**component**下面的无状态组件。可以看看下面的目录结构：

```file
user
├── component
│   ├── password-complex
│   │   ├── index.tsx
│   │   ├── password-complex.less
│   │   └── password-complex.less.d.ts
│   ├── user-detail
│   │   ├── index.tsx
│   │   ├── user-detail.less
│   │   └── user-detail.less.d.ts
│   ├── user-detail-ak
│   │   ├── index.tsx
│   │   ├── user-detail-ak.less
│   │   └── user-detail-ak.less.d.ts
│   ├── user-detail-base-info
│   │   ├── index.tsx
│   │   ├── user-detail-base-info.less
│   │   └── user-detail-base-info.less.d.ts
│   ├── user-detail-resource
│   │   ├── index.tsx
│   │   ├── user-detail-resource.less
│   │   └── user-detail-resource.less.d.ts
│   ├── user-detail-workspace
│   │   └── index.tsx
│   ├── user-form-dialog
│   │   ├── index.tsx
│   │   ├── user-form-dialog.less
│   │   └── user-form-dialog.less.d.ts
│   └── user-list
│       ├── index.tsx
│       ├── user-list.less
│       └── user-list.less.d.ts
├── user-form-wrapper
│   └── index.tsx
├── user-detail-wrapper
│   └── index.tsx
└── user-list-wrapper
    └── index.tsx

```

### 有状态组件

#### 设置只读的state

看过网上的好多实践，为了防止`state`的不可篡改，都会把`state`通过下面的方式设置为只是可读的，这种方式虽然好，但是在我的项目中不会出现，这种错误只有React接触的新人或者以前写Vue的人会犯的，我的项目中一共两个人，不会出现在这种问题。

```typescript
const defaultState = {
  name: string;
}

type IState = Readonly<typeof defaultState>

class User extends Component<{}, IState> {
  readonly state: IState = defaultState;
}

```

但是上面这种方式只是适合类型为[typescript的基本类型](https://www.typescriptlang.org/docs/handbook/basic-types.html),但是如果有自己定义的复杂类型，比如说下面这种：

```tsx

interface IUser {
  name: string;
  id: number:
 age: number;
  ...
}

interface IState {
  list: IUser[];
  total: number;
}
// default state

const userList: IUser = []
const defaultState = {
  list: userList,
  total: 0,
}
```
上面这种就不能通过一个单纯的空数组就推断出list的类型是IUser的数组类型，所以要添加无谓一个`userList`定义。


### 无状态组件

无状态组件也被称为展示组件，如果一个展示组件没有内部的state可以被写为纯函数组件。
如果写的是函数组件，在`@types/react`中定义了一个类型`type SFC<P = {}> = StatelessComponent<P>;`。我们写函数组件的时候，能指定我们的组件为`SFC`或者`StatelessComponent`。这个里面已经预定义了`children`等，所以我们每次就不用指定类型children的类型了。
下面是一个无状态组件的例子：

```tsx
import React, { ReactNode, SFC } from 'react';
import style from './step-complete.less';

export interface IProps  {
  title: string | ReactNode;
  description: string | ReactNode;
}
const StepComplete:SFC<IProps> = ({ title, description, children }) => {
  return (
    <div className={style.complete}>
      <div className={style.completeTitle}>
        {title}
      </div>
      <div className={style.completeSubTitle}>
        {description}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};
export default StepComplete;
```

### 泛型组件

先看一个组件,这个组件就是展示一个列表。

```tsx
import React, { Fragment, PureComponent } from 'react';

export interface IProps<T> {
  total: number;
  list: IYarn[];
  title: string;
  cols: IColumn[];
}

class YarnList  extends PureComponent<IProps> {

}
```

当我们想通用这个组件的时候，但是就是列表的字段不一样，也就是列表对应的不同的类型。这个时候我们可是使用泛型，把类型传递进来（也可以说是通过typescript的类型推断来推断出来）。来看下面的具体实现：

```tsx
export interface IProps<T> {
  total: number;
  list: T[];
  title: string;
  cols: IColumn[];
}

class ResourceList<T> extends PureComponent<IProps<T>> {
  // 我们现在业务的场景会把这个list传递给table，table不同的字段通过外部的父组件传递进来。
tableProps(): ITable<T> {
    const columns: IColumn[] = [
      ...this.props.cols,
      { title: '操作', key: 'operation', render: (record: T) => this.renderOperation(record) },
    ];
    return {
      columns,
      data: this.props.list,
      selectable: false,
      enabaleDefaultOperationCol: false,
      searchEmptyText: '没有搜索到符合条件的资源',
      emptyText: '尚未添加资源',
    };
  }
}

```


### 设置默认值

如果使用的typescript是3.x的版本的话，就不用担心这个问题，就直接在jsx中使用`defaultProps`就可以了。

如果使用的是2.x的版本就要如果定义一个类似下面这样一个可选的值：

```typescript
interface IProps {
  name?: string;
}
```

我们如果在class里面设置defaultProps的话，ts是不认识的。还是要在代码里面进行非空判断。对用这好昂方法可以写一个高阶组件。[高阶组件来源](https://juejin.im/post/5b07caf16fb9a07aa83f2977)

```typescript
export const withDefaultProps = <
  P extends object,
  DP extends Partial<P> = Partial<P>
>(
  defaultProps: DP,
  Cmp: ComponentType<P>,
) => {
  // 提取出必须的属性
  type RequiredProps = Omit<P, keyof DP>;
  // 重新创建我们的属性定义，通过一个相交类型，将所有的原始属性标记成可选的，必选的属性标记成可选的
  type Props = Partial<DP> & Required<RequiredProps>;

  Cmp.defaultProps = defaultProps;

  // 返回重新的定义的属性类型组件，通过将原始组件的类型检查关闭，然后再设置正确的属性类型
  return (Cmp as ComponentType<any>) as ComponentType<Props>;
};

```

## Typescript不好的地方

就类型定义起来有点费劲，有的时候废了大半天的力气发现都是在整ts类型的问题。
然后。。。应该没有了。

## 前端开发规范

这里就主要介绍在书写组件的时候的个人开发规范：

- 字段内容要尽量到末尾再去解释。
  + 例： 一个组件要给一个子（子...）传递一个对象参数，但是现在可以想象到的这个组件只用name字段，为了可扩展，不要只是给这个子（子...）只是传递name属性，要把整个对象传递过去。
  + 例：一个无状态组件能修改用户的姓名，当点击确定按钮进行修改的时候，不要只是把修改后的姓名传递回去，要把整个都传递回去。
- 有状态组件只是处理响应和请求逻辑，不处理任何展示信息。也就是说有状态组件中的`render`函数中只是给子组件传递信息
- 无状态组件可以保存一些state的信息，比如说一个弹窗的展示和隐藏。
- 一个组件不能超过300行代码
- 两行锁进（不同的编译器使用.editorconfig）
- 通用的`interface`放在**common**下面的**schemas**下面
- 非通用的`interface`比如说`IProps`或者`IState`要放在组件的内部
- 超过两个地方可以用的东西，要抽象

## 参考

- [TypeScript 2.8下的终极React组件模式](https://juejin.im/post/5b07caf16fb9a07aa83f2977)