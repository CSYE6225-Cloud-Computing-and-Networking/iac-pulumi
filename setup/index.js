"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const gcp = require("@pulumi/gcp");

require('dotenv').config();
let config = new pulumi.Config();

let subset_public_raw = config.require("SUBNET_PUBLIC");
let subset_private_raw = config.require("SUBNET_PRIVATE");
let az_raw = config.require("AZ");

let subnet_public = subset_public_raw.split(" ");
let subnet_private = subset_private_raw.split(" ");
let az = az_raw.split(" ")




const VPC_NAME = config.require("VPC_NAME")
const SUBNET_PUBLIC_2 = config.require("SUBNET_PUBLIC_2")
const SUBNET_PUBLIC_1 = config.require("SUBNET_PUBLIC_1")
const SUBNET_PUBLIC_3 = config.require("SUBNET_PUBLIC_3")
const SUBNET_PRIVATE_1 = config.require("SUBNET_PRIVATE_1")
const SUBNET_PRIVATE_2 = config.require("SUBNET_PRIVATE_2")
const SUBNET_PRIVATE_3 = config.require("SUBNET_PRIVATE_3")
const INTERNET_GATEWAY = config.require("INTERNET_GATEWAY")
const ROUTE_TABLE_PUBLIC = config.require("ROUTE_TABLE_PUBLIC")
const ROUTE_TABLE_PRIVATE = config.require("ROUTE_TABLE_PRIVATE")

const available = aws.getAvailabilityZones();

let az_list = []

let ami_id = config.require("AMI")





const main = new aws.ec2.Vpc(VPC_NAME, {
    cidrBlock: config.require("VPC_CIDR"),
    instanceTenancy: "default",
    tags: {
        Name: VPC_NAME,
    },
});

available.then(result => {
    az_list= result.names
    let az_count =3;
    // console.log('azlist',az_list)
    if(az_list.length<az_count){
        az_count=az_list.length
    }
    az=az_list

    const gw = new aws.ec2.InternetGateway(INTERNET_GATEWAY, {
        vpcId: main.id,
        tags: {
            Name: INTERNET_GATEWAY,
        },
    });

    const route_table_public = new aws.ec2.RouteTable(ROUTE_TABLE_PUBLIC, {
        vpcId: main.id,
        tags: {
            Name: ROUTE_TABLE_PUBLIC,
        },
        routes: [
            {
                cidrBlock: "0.0.0.0/0",
                gatewayId: gw.id,
            }
        ],
    });
    
    const route_table_private = new aws.ec2.RouteTable(ROUTE_TABLE_PRIVATE, {
        vpcId: main.id,
        tags: {
            Name: ROUTE_TABLE_PRIVATE,
        },
    });

    let subnet_pub_1;

    let subnet_pub_ids = []
    let subnet_pri_ids = []

    for(let i=0 ;i<az_count; i++){
        let subpub = new aws.ec2.Subnet(`SUBNET_PUBLIC_${i}`, {
            vpcId: main.id,
            cidrBlock: subnet_public[i],
            tags: {
                Name: `SUBNET_PUBLIC_${i}`,
            },
            availabilityZone: az[i],
        });
        subnet_pub_ids.push(subpub)
        subnet_pub_1 = subpub;

        new aws.ec2.RouteTableAssociation(`subnet_router_association_${i}`, {
            subnetId: subpub.id,
            routeTableId: route_table_public.id,
        });

        let subpriv = new aws.ec2.Subnet(`SUBNET_PRIVATE_${i}`, {
            vpcId: main.id,
            cidrBlock: subnet_private[i],
            tags: {
                Name: `SUBNET_PRIVATE_${i}`,
            },
            availabilityZone: az[i],
        });

        subnet_pri_ids.push(subpriv.id)

        new aws.ec2.RouteTableAssociation(`subnet_private_router_association_${i}`, {
            subnetId: subpriv.id,
            routeTableId: route_table_private.id,
        });

    }

    //load balancer security group
    const lb_sec_gr = new aws.ec2.SecurityGroup("lb_security_group", {
        description: "Allow TLS inbound traffic",
        vpcId: main.id,
        ingress: [{
            description: "TLS from VPC 443",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            cidrBlocks: [ "0.0.0.0/0" ],
        },
        {
            description: "TLS from VPC 80",
            fromPort: 80,
            toPort: 80,
            protocol: "tcp",
            cidrBlocks: [ "0.0.0.0/0" ],
        }],
        egress: [{
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
            ipv6CidrBlocks: ["::/0"],
        }],
        tags: {
            Name: "lb_security_group",
        },
    });

    //ec2 security group
    const app_sec_gr = new aws.ec2.SecurityGroup("application_security_group", {
        description: "Allow TLS inbound traffic",
        vpcId: main.id,
        ingress: [
        // {
        //     description: "TLS from VPC 443",
        //     fromPort: 443,
        //     toPort: 443,
        //     protocol: "tcp",
        //     cidrBlocks: [ "0.0.0.0/0" ],
        // },
        {
            description: "TLS from VPC 22",
            fromPort: 22,
            toPort: 22,
            protocol: "tcp",
            securityGroups: [lb_sec_gr.id],
            // cidrBlocks: [ "0.0.0.0/0" ],
        },
            // {
            //     description: "TLS from VPC 80",
            //     fromPort: 80,
            //     toPort: 80,
            //     protocol: "tcp",
            //     cidrBlocks: [ "0.0.0.0/0" ],
            // },
        {
            description: "TLS from VPC 8000",
            fromPort: 8000,
            toPort: 8000,
            protocol: "tcp",
            securityGroups: [lb_sec_gr.id],
            // cidrBlocks: [ "0.0.0.0/0" ],
        }],
        egress: [{
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
            ipv6CidrBlocks: ["::/0"],
        }],
        tags: {
            Name: "application_security_group",
        },
    });

    //sec grp for rds
    const rds_sec_gr = new aws.ec2.SecurityGroup("database_security_group", {
        description: "allow traffic from app",
        vpcId: main.id,
        ingress: [{
            description: "app ",
            fromPort: 3306,
            toPort: 3306,
            protocol: "tcp",
            securityGroups: [app_sec_gr.id]
        }],
        tags: {
            Name: "database_security_group",
        },
    });

    //para rds
    const rdspara = new aws.rds.ParameterGroup("rdspara", {
        family: "mysql5.7",
        parameters: [
            {
                name: "character_set_server",
                value: "utf8",
            },
            {
                name: "character_set_client",
                value: "utf8",
            },
        ],
        name: "rdspara"
    });

    //rds subnet group
    const rds_subnet_group = new aws.rds.SubnetGroup("rds_subnet_group", {
        subnetIds: [
            subnet_pri_ids[0],
            subnet_pri_ids[1]
        ],
        name:"rds_subnet_group",
        tags: {
            Name: "rds_subnet_group",
        },
    });

    let rds_user = config.require("RDS_USER")
    let rds_password= config.require("RDS_PASSWORD")
    let rds_db= config.require("RDS_DB")

    //setup RDS
    const rds = new aws.rds.Instance("csye6225", {
        allocatedStorage: 10,
        dbName: "csye6225",
        engine: "mysql",
        engineVersion: "5.7",
        instanceClass: "db.t3.micro",
        parameterGroupName: "default.mysql5.7",
        password: rds_password,
        skipFinalSnapshot: true,
        username: rds_user,
        publiclyAccessible: false,
        multiAz: false,
        vpcSecurityGroupIds: [rds_sec_gr.id],
        parameterGroupName: "rdspara",
        dbSubnetGroupName:"rds_subnet_group",
        dbName: "cloudDB",
    });
    
    
    const hostname = rds.endpoint.apply(endpoint => endpoint.split(":")[0]);
 
 
    // const user_data = pulumi
    // .all([rds.id, hostname])
    // .apply(([id, endpoint]) =>
    //   `#!/bin/bash
    //    echo "host=${endpoint}" > /etc/environment
    //    echo "user=${rds_user}" >> /etc/environment
    //    echo "password=${rds_password}" >> etc/environment
    //    echo "database=${rds_db}" >> /etc/environment
    //    sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/config.json -s
    //    sudo touch /opt/user-data
    //   `);

    //sns
    const snsTopic = new aws.sns.Topic("snsTopic", {

    });

    const user_data = pulumi
    .all([rds.id, hostname, snsTopic.arn])
    .apply(([id, endpoint, arn]) => {
        const script = `#!/bin/bash
        echo "host=${endpoint}" > /etc/environment
        echo "user=${rds_user}" >> /etc/environment
        echo "password=${rds_password}" >> etc/environment
        echo "database=${rds_db}" >> /etc/environment
        sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/config.json -s
        sudo touch /opt/user-data
        echo "snsTopic=${arn}" >> /etc/environment
        `;
        // console.log('script',script)
        const base64UserData = Buffer.from(script).toString('base64');

        return base64UserData;
  });

//     let user_data = 
//     `#!/bin/sh
// echo "export host=csye62258936f45.c1d9714bidgz.us-east-1.rds.amazonaws.com" >> /etc/environment
// echo "export user=csye6225" >> /etc/environment
// echo "export password=mysqlmasterpassword" >> /etc/environment
// `
    // console.log('user data',user_data.toString())
    let bufferObj = Buffer.from(user_data, "utf8");
    const user_data_64 = bufferObj.toString("base64");

    // console.log('user data 64',user_data_64)

    const ec2Role = new aws.iam.Role("ec2Role", {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "ec2.amazonaws.com",
                },
            }],
        }),
        tags: {
            "Name": "ec2Role",
        },
    });

    //arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

    const test_attach = new aws.iam.RolePolicyAttachment("test-attach", {
        role: ec2Role.name,
        policyArn: "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
    });

    const test_attach2 = new aws.iam.RolePolicyAttachment("test-attach2", {
        role: ec2Role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonRoute53FullAccess",
    });

    // const test_attach3 = new aws.iam.RolePolicyAttachment("test-attach3", {
    //     role: ec2Role.name,
    //     policyArn: "arn:aws:iam::aws:policy/IAMFullAccess",
    // });

    const test_attach4 = new aws.iam.RolePolicyAttachment("test-attach4", {
        role: ec2Role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
    });

    const testProfile = new aws.iam.InstanceProfile("testProfile", {role: ec2Role.name});

    //Load balancer
    const load_bal = new aws.lb.LoadBalancer("loadbal", {
        internal: false,
        loadBalancerType: "application",
        securityGroups: [lb_sec_gr.id],
        subnets: subnet_pub_ids.map(subnet => (subnet.id)),
        enableDeletionProtection: false,

    });

    

    //load balancer target group
    const alb_target_group = new aws.lb.TargetGroup("albTargetGroup", {
        port: 8000,
        protocol: "HTTP",
        vpcId: main.id,
        healthCheck: {
            enabled: true,
            interval: 30,
            path: "/healthz", 
            port: "traffic-port", 
            protocol: "HTTPS",
            timeout: 10,
            healthyThreshold: 2,
            unhealthyThreshold: 2,
        },
    });

    // const listener = new aws.lb.Listener(`app-listener`, {
    //     loadBalancerArn: load_bal.arn,
    //     port: 80,
    //     defaultActions: [{
    //         type: "forward",
    //         targetGroupArn: alb_target_group.arn, 
    //     }],
    // });

    let alb_ssl_crt = config.require("ssl_crt")

    const frontEndListener = new aws.lb.Listener("app-listener", {
        loadBalancerArn: load_bal.arn,
        port: 443,
        protocol: "HTTPS",
        sslPolicy: "ELBSecurityPolicy-2016-08",
        certificateArn: alb_ssl_crt,
        defaultActions: [{
            type: "forward",
            targetGroupArn: alb_target_group.arn,
        }],
    });

    let key = config.require("key")
    // auto scaling group

    const launchTemplate = new aws.ec2.LaunchTemplate("appLaunchTemplate", {
        imageId: ami_id,
        instanceType: "t2.micro",
        keyName: key,
        userData: user_data,
        iamInstanceProfile: {
            name: testProfile.name,
        },
        networkInterfaces: [{
            associatePublicIpAddress: true,
            deleteOnTermination: true,
            deviceIndex: 0,
            securityGroups: [app_sec_gr.id],
        }],
    });
    
    const asg2 = new aws.autoscaling.Group("asg", {
        vpcZoneIdentifiers: subnet_pub_ids,
        desiredCapacity: 1,
        maxSize: 3,
        minSize: 1,
        launchTemplate: {
            id: launchTemplate.id,
        },
        defaultCooldown: 60,
        targetGroupArns:[alb_target_group.arn]

    });



    // const web = new aws.ec2.Instance("web", {
    //     // ami: custom_ami.then(custom_ami => custom_ami.id),
    //     ami: ami_id,
    //     instanceType: "t2.micro",
    //     vpcSecurityGroupIds: [
    //         app_sec_gr.id,
    //     ],
    //     subnetId:subnet_pub_1.id,
    //     keyName: key,
    //     associatePublicIpAddress:true,
    //     tags: {
    //         Name: "demo_ec2_1",
    //     },
    //     rootBlockDevice: {
    //         deleteOnTermination: true,
    //         volumeSize: 25, 
    //         volumeType: "gp2", 
             
    //     },
    //     userData: user_data,
    //     dependsOn: [rds],
    //     iamInstanceProfile: testProfile
    // });

    const zoneId = config.require("zoneId")
    const domain = config.require("domain")

    const dns_record = new aws.route53.Record("dns_record", {
        zoneId: zoneId,
        name: domain,
        type: "A",
        // ttl: 300,
        // records: [web.publicIp],
        aliases: [{
            name: load_bal.dnsName,
            zoneId: load_bal.zoneId,
            evaluateTargetHealth: true,
        }],
    });

    //Certificate
    // const issued_cert = aws.acm.getCertificate({
    //     domain: "dev.neucloud.me",
    // })

    // const certValidation = new aws.route53.Record("certValidation", {
    //     name: "cert_vali",
    //     records: [issued_cert.domainValidationOptions[0].resourceRecordValue],
    //     ttl: 60,
    //     type: "CNAME",
    //     zoneId: zoneId,
    // });
    
    // const certCertificateValidation = new aws.acm.CertificateValidation("cert", {
    //     certificateArn: issued_cert,
    //     validationRecordFqdns: [certValidation.fqdn],
    // });

    // const exampleCertificateValidation = new aws.acm.CertificateValidation("exampleCertificateValidation", {
    //     certificateArn: issued_cert.arn,
    // });

    const batPolicyUp = new aws.autoscaling.Policy("batPolicyUp", {
        scalingAdjustment: 1,
        adjustmentType: "ChangeInCapacity",
        cooldown: 60,
        autoscalingGroupName: asg2.name,
    });

    const batPolicyDown = new aws.autoscaling.Policy("batPolicyDown", {
        scalingAdjustment: -1,
        adjustmentType: "ChangeInCapacity",
        cooldown: 60,
        autoscalingGroupName: asg2.name,
    });

    const batMetricAlarmUp = new aws.cloudwatch.MetricAlarm("batMetricAlarmUp", {
        comparisonOperator: "GreaterThanOrEqualToThreshold",
        evaluationPeriods: 2,
        metricName: "CPUUtilization",
        namespace: "AWS/EC2",
        period: 60,
        statistic: "Average",
        threshold: 5,
        dimensions: {
            AutoScalingGroupName: asg2.name,
        },
        alarmDescription: "This metric monitors ec2 cpu utilization",
        alarmActions: [batPolicyUp.arn],
    });

    const batMetricAlarmDown = new aws.cloudwatch.MetricAlarm("batMetricAlarmDown", {
        comparisonOperator: "LessThanOrEqualToThreshold",
        evaluationPeriods: 2,
        metricName: "CPUUtilization",
        namespace: "AWS/EC2",
        period: 60,
        statistic: "Average",
        threshold: 3,
        dimensions: {
            AutoScalingGroupName: asg2.name,
        },
        alarmDescription: "This metric monitors ec2 cpu utilization",
        alarmActions: [batPolicyDown.arn],
    });


    

    //gcp
    const gcpServiceAcc = config.require("gcpServiceAcc")

    const bucket = new gcp.storage.Bucket("bucket-webapp-cyse", {
        location: "US"
    });

    const serviceAccount = new gcp.serviceaccount.Account("serviceAccount", {
        accountId: "ser-acc",
        displayName: "Service Account",
        project: gcpServiceAcc
    });

    const gcpKey = new gcp.serviceaccount.Key("gcpKey", {
        serviceAccountId: serviceAccount.name,
        publicKeyType: "TYPE_X509_PEM_FILE",
    });

    const serviceAccountEmail = serviceAccount.email;

    // Apply the Pulumi program
    pulumi.all([serviceAccountEmail]).apply(([email]) => {
        const bucketIAMMember = new gcp.storage.BucketIAMMember("bucketIAMMember", {
            bucket: bucket.name,
            role: "roles/storage.admin",
            member:`serviceAccount:${email}`, 
          });
        console.log(`Service Account Email: ${email}`);
    });
    
   

    // const roleName = "roles/storage.admin"; 
    // const policy = new gcp.projects.IAMPolicy(`role-serv-policy`, {
    //     project: gcp.config.project,
    //     bindings: [{
    //         role: roleName,
    //         members: [`serviceAccount:${serviceAccount.email}`],
    //     }],
    // });

    // const admin_account_iam = new gcp.serviceaccount.IAMBinding("admin-account-iam", {
    //     serviceAccountId: serviceAccount.name,
    //     role: "roles/storage.admin",
    //     members: ["user:nishith0514@gmail.com"],
    // });
    

    //DynamoDb
    const Users_table = new aws.dynamodb.Table("users", {
        // define possible hash and range key attributes only
        
        attributes: [
            {
                name: 'email',
                type: 'S' 
            },
            {
                name: 'submission',
                type: 'S' 
            }
        ],
        hashKey: 'submission',
        rangeKey: 'email',
        billingMode: 'PROVISIONED', 
    
        writeCapacity: 5,
        readCapacity: 5
    });


    //lambda
    const role = new aws.iam.Role("lambdaRole", {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
                {
                    Action: "sts:AssumeRole",
                    Principal: {
                        Service: "lambda.amazonaws.com",
                    },
                    Effect: "Allow",
                    Sid: "",
                },
            ],
        }),
    });

    new aws.iam.RolePolicyAttachment("lambdaAccess", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AWSLambda_FullAccess",
    });   

    new aws.iam.RolePolicyAttachment("lambdaCloudwatchAccess", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess",
    });
    
    new aws.iam.RolePolicyAttachment("lambdaDynamoAccess", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess",
    }); 

    new aws.iam.RolePolicyAttachment("lambdaSNSAccess", {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/AmazonSNSFullAccess",
    }); 


    const zipFilePath = "../../serverless/serv/index.zip"; 
    const mailKey = config.require("mailKey")

    // Define the AWS Lambda function
    const lambda3 = new aws.lambda.Function("myfunction", {
        role: role.arn,
        runtime:  "nodejs18.x",
        handler: "index.handler",
        code: new pulumi.asset.FileArchive(zipFilePath),
        environment: {
            variables: {
                dbName: Users_table.name,
                gcpBucket: bucket.name,
                serviceAccount: serviceAccount.name,
                privateKey: gcpKey.privateKey,
                mailKey : mailKey
            },
        },
    });
    

    const snsSubscription = new aws.sns.TopicSubscription("mySnsSubscription", {
        protocol: "lambda",
        endpoint: lambda3.arn,
        topic: snsTopic.arn,
    });

    const lambdaPermission = new aws.lambda.Permission("snsLambdaPermission", {
        action: "lambda:InvokeFunction",
        function: lambda3.arn,
        principal: "sns.amazonaws.com",
        sourceArn: snsTopic.arn,
    });

        
    });

    //https://github.com/NishithKody/Neetcode/archive/refs/heads/main.zip