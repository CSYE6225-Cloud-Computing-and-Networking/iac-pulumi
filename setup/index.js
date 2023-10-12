"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

require('dotenv').config();

console.log('region ----------',process.env.REGION)
let subset_public_raw = process.env.SUBNET_PUBLIC;
let subset_private_raw = process.env.SUBNET_PRIVATE;
let az_raw = process.env.AZ;

let subnet_public = subset_public_raw.split(" ");
let subnet_private = subset_private_raw.split(" ");
let az = az_raw.split(" ")

console.log('subset ----------',subnet_public)
console.log('subset ----------',subnet_private)
console.log('az ----------',az)



const main = new aws.ec2.Vpc("main", {
    cidrBlock: process.env.VPC_CIDR,
    instanceTenancy: "default",
    tags: {
        Name: "main",
    },
});

const subnet_public_1 = new aws.ec2.Subnet("subnet_public_1", {
    vpcId: main.id,
    cidrBlock: subnet_public[0],
    tags: {
        Name: "public",
    },
    availabilityZone: az[0],
});

const subnet_public_2 = new aws.ec2.Subnet("subnet_public_2", {
    vpcId: main.id,
    cidrBlock: subnet_public[1],
    tags: {
        Name: "public",
    },
    availabilityZone: az[1],
});

const subnet_public_3 = new aws.ec2.Subnet("subnet_public_3", {
    vpcId: main.id,
    cidrBlock: subnet_public[2],
    tags: {
        Name: "public",
    },
    availabilityZone: az[2],
});

const subnet_private_1 = new aws.ec2.Subnet("subnet_private_1", {
    vpcId: main.id,
    cidrBlock: "10.0.4.0/24",
    tags: {
        Name: "private",
    },
    availabilityZone: az[0],
});

const subnet_private_2 = new aws.ec2.Subnet("subnet_private_2", {
    vpcId: main.id,
    cidrBlock: "10.0.5.0/24",
    tags: {
        Name: "private",
    },
    availabilityZone: az[1],
});

const subnet_private_3 = new aws.ec2.Subnet("subnet_private_3", {
    vpcId: main.id,
    cidrBlock: "10.0.6.0/24",
    tags: {
        Name: "private",
    },
    availabilityZone: az[2],
});


const gw = new aws.ec2.InternetGateway("gw", {
    vpcId: main.id,
    tags: {
        Name: "gw",
    },
});


const route_table_public = new aws.ec2.RouteTable("route_table_public", {
    vpcId: main.id,
    tags: {
        Name: "route_table_public",
    },
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: gw.id,
        }
    ],
});

const route_table_private = new aws.ec2.RouteTable("route_table_private", {
    vpcId: main.id,
    tags: {
        Name: "route_table_private",
    },
});

const subnet_router_association = new aws.ec2.RouteTableAssociation("subnet_router_association", {
    subnetId: subnet_public_1.id,
    routeTableId: route_table_public.id,
});

const subnet_router_association_2 = new aws.ec2.RouteTableAssociation("subnet_router_association_2", {
    subnetId: subnet_public_2.id,
    routeTableId: route_table_public.id,
});

const subnet_router_association_3 = new aws.ec2.RouteTableAssociation("subnet_router_association_3", {
    subnetId: subnet_public_3.id,
    routeTableId: route_table_public.id,
});


const subnet_private_router_association = new aws.ec2.RouteTableAssociation("subnet_private_router_association", {
    subnetId: subnet_private_1.id,
    routeTableId: route_table_private.id,
});

const subnet_private_router_association_2 = new aws.ec2.RouteTableAssociation("subnet_private_router_association_2", {
    subnetId: subnet_private_2.id,
    routeTableId: route_table_private.id,
});

const subnet_private_router_association_3 = new aws.ec2.RouteTableAssociation("subnet_private_router_association_3", {
    subnetId: subnet_private_3.id,
    routeTableId: route_table_private.id,
});


