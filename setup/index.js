"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

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
    console.log('azlist',az_list)
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

    for(let i=0 ;i<az_count; i++){
        let subpub = new aws.ec2.Subnet(`SUBNET_PUBLIC_${i}`, {
            vpcId: main.id,
            cidrBlock: subnet_public[i],
            tags: {
                Name: `SUBNET_PUBLIC_${i}`,
            },
            availabilityZone: az[i],
        });
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

        new aws.ec2.RouteTableAssociation(`subnet_private_router_association_${i}`, {
            subnetId: subpriv.id,
            routeTableId: route_table_private.id,
        });

    }

    //ec2 security group

    const app_sec_gr = new aws.ec2.SecurityGroup("application_security_group", {
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
            description: "TLS from VPC 22",
            fromPort: 22,
            toPort: 22,
            protocol: "tcp",
            cidrBlocks: [ "0.0.0.0/0" ],
        },
        {
            description: "TLS from VPC 80",
            fromPort: 80,
            toPort: 80,
            protocol: "tcp",
            cidrBlocks: [ "0.0.0.0/0" ],
        },
        {
            description: "TLS from VPC 8000",
            fromPort: 8000,
            toPort: 8000,
            protocol: "tcp",
            cidrBlocks: [ "0.0.0.0/0" ],
        }],
        tags: {
            Name: "application_security_group",
        },
    });


    //create ec2
    // const custom_ami = aws.ec2.getAmi({
    //     mostRecent: true,
    //     filters: [
    //         // {
    //         //     name: "name",
    //         //     values: ["csye*"],
    //         // },
    //         {
    //             name: "virtualization-type",
    //             values: ["hvm"],
    //         },
    //     ],
    // });

    // console.log('ami id-',custom_ami.then(custom_ami => console.log(custom_ami.id)))

    let ami_id = "ami-025f7fdba4cedd298"

    const web = new aws.ec2.Instance("web", {
        // ami: custom_ami.then(custom_ami => custom_ami.id),
        ami: ami_id,
        instanceType: "t2.micro",
        vpcSecurityGroupIds: [
            app_sec_gr.id,
        ],
        subnetId:subnet_pub_1.id,
        keyName: "webTest",
        associatePublicIpAddress:true,
        tags: {
            Name: "demo_ec2_1",
        },
    });

    
});

// const subnet_public_1 = new aws.ec2.Subnet(SUBNET_PUBLIC_1, {
//     vpcId: main.id,
//     cidrBlock: subnet_public[0],
//     tags: {
//         Name: SUBNET_PUBLIC_1,
//     },
//     availabilityZone: az[0],
// });

// const subnet_public_2 = new aws.ec2.Subnet(SUBNET_PUBLIC_2, {
//     vpcId: main.id,
//     cidrBlock: subnet_public[1],
//     tags: {
//         Name: SUBNET_PUBLIC_2,
//     },
//     availabilityZone: az[1],
// });

// const subnet_public_3 = new aws.ec2.Subnet(SUBNET_PUBLIC_3, {
//     vpcId: main.id,
//     cidrBlock: subnet_public[2],
//     tags: {
//         Name: SUBNET_PUBLIC_3,
//     },
//     availabilityZone: az[2],
// });

// const subnet_private_1 = new aws.ec2.Subnet(SUBNET_PRIVATE_1, {
//     vpcId: main.id,
//     cidrBlock: subnet_private[0],
//     tags: {
//         Name: SUBNET_PRIVATE_1,
//     },
//     availabilityZone: az[0],
// });

// const subnet_private_2 = new aws.ec2.Subnet(SUBNET_PRIVATE_2, {
//     vpcId: main.id,
//     cidrBlock: subnet_private[1],
//     tags: {
//         Name: SUBNET_PRIVATE_2,
//     },
//     availabilityZone: az[1],
// });

// const subnet_private_3 = new aws.ec2.Subnet(SUBNET_PRIVATE_3, {
//     vpcId: main.id,
//     cidrBlock: subnet_private[2],
//     tags: {
//         Name: SUBNET_PRIVATE_3,
//     },
//     availabilityZone: az[2],
// });







// const subnet_router_association = new aws.ec2.RouteTableAssociation("subnet_router_association", {
//     subnetId: subnet_public_1.id,
//     routeTableId: route_table_public.id,
// });

// const subnet_router_association_2 = new aws.ec2.RouteTableAssociation("subnet_router_association_2", {
//     subnetId: subnet_public_2.id,
//     routeTableId: route_table_public.id,
// });

// const subnet_router_association_3 = new aws.ec2.RouteTableAssociation("subnet_router_association_3", {
//     subnetId: subnet_public_3.id,
//     routeTableId: route_table_public.id,
// });


// const subnet_private_router_association = new aws.ec2.RouteTableAssociation("subnet_private_router_association", {
//     subnetId: subnet_private_1.id,
//     routeTableId: route_table_private.id,
// });

// const subnet_private_router_association_2 = new aws.ec2.RouteTableAssociation("subnet_private_router_association_2", {
//     subnetId: subnet_private_2.id,
//     routeTableId: route_table_private.id,
// });

// const subnet_private_router_association_3 = new aws.ec2.RouteTableAssociation("subnet_private_router_association_3", {
//     subnetId: subnet_private_3.id,
//     routeTableId: route_table_private.id,
// });


