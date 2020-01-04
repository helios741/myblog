```
# openssl genrsa -out helios.key 1024
Generating RSA private key, 1024 bit long modulus
...........++++++
......................++++++
e is 65537 (0x10001)

# ll
总用量 4
-rw-r--r-- 1 root root 887 1月   4 10:29 helios.key
```


```
 openssl rsa -in helios.key -pubout -out  helios.pem
writing RSA key
[root@ambari test-cert]# ll
总用量 8
-rw-r--r-- 1 root root 887 1月   4 10:29 helios.key
-rw-r--r-- 1 root root 272 1月   4 10:31 helios.pem
```


```
# openssl req -key helios.key -new -out  helios.req
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [XX]:beijing
string is too long, it needs to be less than  2 bytes long
Country Name (2 letter code) [XX]:BJ
State or Province Name (full name) []:BeiJing
Locality Name (eg, city) [Default City]:
Organization Name (eg, company) [Default Company Ltd]:China
Organizational Unit Name (eg, section) []:
Common Name (eg, your name or your server's hostname) []:helios
Email Address []:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
[root@ambari test-cert]# ll
总用量 12
-rw-r--r-- 1 root root 887 1月   4 10:29 helios.key
-rw-r--r-- 1 root root 272 1月   4 10:31 helios.pem
-rw-r--r-- 1 root root 627 1月   4 10:33 helios.req
```

```shell
# openssl req -in helios.req
-----BEGIN CERTIFICATE REQUEST-----
MIIBlzCCAQACAQAwVzELMAkGA1UEBhMCQkoxEDAOBgNVBAgMB0JlaUppbmcxFTAT
BgNVBAcMDERlZmF1bHQgQ2l0eTEOMAwGA1UECgwFQ2hpbmExDzANBgNVBAMMBmhl
bGlvczCBnzANBgkqhkiG9w0BAQEFAAOBjQAwgYkCgYEAsltXfcYB5RvsfqfN9A7C
YT7ZIyWndZZOrAVrU4Sos63MU/w7JyY5eqHAog6MtcUJMkevC7uZ+9oIJhwi7k9Z
a/3cUhopGlfjwf+7x2kXjrF37gkdrRV6R4bfgW49xxQZQeqCAli1rC87DShab/VN
8yLWJXZATyK39C7dUtmqpr8CAwEAAaAAMA0GCSqGSIb3DQEBCwUAA4GBAAePwyef
EGKnoI7OPrTdyHPa1RdIi9Yb9gjNhOQWBiM6kCPy7S6HwqABsF+sWboGOoixk0T6
q53/7rpEBbelkrzAP/H5J8MBj9bPB5Mvh5H2Dcw9GGz72D/6PWNJLzhrhxjBlfb3
gswSbj6OCg0meHoDBcEvOhsNGQFYX/tImW6p
-----END CERTIFICATE REQUEST-----
[root@ambari test-cert]# openssl req -in helios.req -noout -text
Certificate Request:
    Data:
        Version: 0 (0x0)
        Subject: C=BJ, ST=BeiJing, L=Default City, O=China, CN=helios
        Subject Public Key Info:
            Public Key Algorithm: rsaEncryption
                Public-Key: (1024 bit)
                Modulus:
                    00:b2:5b:57:7d:c6:01:e5:1b:ec:7e:a7:cd:f4:0e:
                    c2:61:3e:d9:23:25:a7:75:96:4e:ac:05:6b:53:84:
                    a8:b3:ad:cc:53:fc:3b:27:26:39:7a:a1:c0:a2:0e:
                    8c:b5:c5:09:32:47:af:0b:bb:99:fb:da:08:26:1c:
                    22:ee:4f:59:6b:fd:dc:52:1a:29:1a:57:e3:c1:ff:
                    bb:c7:69:17:8e:b1:77:ee:09:1d:ad:15:7a:47:86:
                    df:81:6e:3d:c7:14:19:41:ea:82:02:58:b5:ac:2f:
                    3b:0d:28:5a:6f:f5:4d:f3:22:d6:25:76:40:4f:22:
                    b7:f4:2e:dd:52:d9:aa:a6:bf
                Exponent: 65537 (0x10001)
        Attributes:
            a0:00
    Signature Algorithm: sha256WithRSAEncryption
         07:8f:c3:27:9f:10:62:a7:a0:8e:ce:3e:b4:dd:c8:73:da:d5:
         17:48:8b:d6:1b:f6:08:cd:84:e4:16:06:23:3a:90:23:f2:ed:
         2e:87:c2:a0:01:b0:5f:ac:59:ba:06:3a:88:b1:93:44:fa:ab:
         9d:ff:ee:ba:44:05:b7:a5:92:bc:c0:3f:f1:f9:27:c3:01:8f:
         d6:cf:07:93:2f:87:91:f6:0d:cc:3d:18:6c:fb:d8:3f:fa:3d:
         63:49:2f:38:6b:87:18:c1:95:f6:f7:82:cc:12:6e:3e:8e:0a:
         0d:26:78:7a:03:05:c1:2f:3a:1b:0d:19:01:58:5f:fb:48:99:
         6e:a9
```
