"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const main = new aws.ec2.Vpc("main", {
    cidrBlock: "10.0.0.0/16",
    instanceTenancy: "default",
    tags: {
        Name: "main",
    },
});

const subnet_public_1 = new aws.ec2.Subnet("subnet_public_1", {
    vpcId: main.id,
    cidrBlock: "10.0.1.0/24",
    tags: {
        Name: "public",
    },
    availabilityZone: "us-east-1a",
});

const subnet_public_2 = new aws.ec2.Subnet("subnet_public_2", {
    vpcId: main.id,
    cidrBlock: "10.0.2.0/24",
    tags: {
        Name: "public",
    },
    availabilityZone: "us-east-1b",
});

const subnet_public_3 = new aws.ec2.Subnet("subnet_public_3", {
    vpcId: main.id,
    cidrBlock: "10.0.3.0/24",
    tags: {
        Name: "public",
    },
    availabilityZone: "us-east-1c",
});

const subnet_private_1 = new aws.ec2.Subnet("subnet_private_1", {
    vpcId: main.id,
    cidrBlock: "10.0.4.0/24",
    tags: {
        Name: "private",
    },
    availabilityZone: "us-east-1a",
});

const subnet_private_2 = new aws.ec2.Subnet("subnet_private_2", {
    vpcId: main.id,
    cidrBlock: "10.0.5.0/24",
    tags: {
        Name: "private",
    },
    availabilityZone: "us-east-1b",
});

const subnet_private_3 = new aws.ec2.Subnet("subnet_private_3", {
    vpcId: main.id,
    cidrBlock: "10.0.6.0/24",
    tags: {
        Name: "private",
    },
    availabilityZone: "us-east-1c",
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


