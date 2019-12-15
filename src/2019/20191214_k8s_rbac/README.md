# 浅谈K8S中的RBAC

## 0、介绍

我们都知道apiserver中的访问安全控制分为四个步骤：
![image](https://user-images.githubusercontent.com/12036324/70845421-76c20100-1e89-11ea-9564-4bdfc02f4510.png)
1. 认证（[Authenicating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)）：你是谁
2. 授权（[Authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)）：能做什么事情
3. 访问控制（[Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)）：能访问什么资源
4. 对数据库的操作（一般是Etcd）

本篇文章要说的RBAC是认证（步骤二）中的一种认证模型，当然也是当下最流行的（1.8之后的默认开启）。目前api-server支持的认证模型有：
- [Node](https://kubernetes.io/docs/reference/access-authn-authz/node/): 直接对node上的kubelet进行访问控制
- [ABAC](https://kubernetes.io/docs/reference/access-authn-authz/abac/): 将属性组合，对用户进行访问控制
- [webhook](https://kubernetes.io/docs/reference/access-authn-authz/webhook/): 在http请求之后触发的回调
- [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/): 把用户和能力分开，然后根据不同用户绑定不同的能力

如果要开启RBAC，要在apiserver的启动参数中增加：
```shell
--authorization-mode=RBAC
```

## 一、 认识用户和用户组以及ServiceAccount

### 1、了解用户和组

#### 1.1、用户


#### 1.2、 组

### 2、集群中的用户 ServiceAccount

#### 2.1、ServiceAccount和授权进行绑定


#### 2.2、创建ServiceAccount


#### 2.3、将ServiceAccount分配给pod

## 二、介绍RBAC


## 三、RBAC下的资源Role/RoleBinding ClusterRole/ClusterRoleBinding


## 四、我在RBAC实践中遇到的问题


## 五、总结
