# cortex-plugin-aws

Full AWS infrastructure manager: EC2, S3, Lambda, RDS, CloudWatch.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-aws
cortex plugin install github:CortexPrism/cortex-plugin-aws
cortex plugin install ./manifest.json
```

## Quick Start

```bash
cortex tools list
cortex chat --plugin cortex-plugin-aws
```

## Tools

### aws_list_resources — List resources by service

- `service` (enum: ec2/s3/lambda/rds/cloudwatch/iam, required)
- `region` (string, us-east-1)
- `filters` (string, JSON)

### aws_describe — Describe a resource

- `service` (string, required)
- `resource_id` (string, required)
- `region` (string)

### aws_get_logs — Get CloudWatch logs

- `log_group` (string, required)
- `hours` (number, 1)
- `filter_pattern` (string)

### aws_list_buckets — List S3 buckets

No parameters.

### aws_invoke_lambda — Invoke Lambda

- `function_name` (string, required)
- `payload` (string, JSON)
- `region` (string)

### aws_cost_estimate — Estimate monthly cost

- `service` (string)
- `region` (string)

## Configuration

```json
{
  "plugins": {
    "cortex-plugin-aws": {
      "enabled": true,
      "config": {
        "awsAccessKey": "",
        "awsSecretKey": "",
        "awsRegion": "us-east-1",
        "awsProfile": "default"
      }
    }
  }
}
```

## Development

```bash
deno task test
deno task lint
deno task validate
```

## License

MIT
