#!/bin/bash

attempt=1

echo "Pinging google DNS 8.8.4.4"

while true; do
	success=$((`ping -t 1 -c 1 8.8.4.4|grep packet|awk '{print $7}'|awk -F'.' '{print $1}'`))

	if [[ "$success" -gt 0 ]]; then
		echo "		$attempt: down at `date`";
	else
		echo "		$attempt: up  at `date`";
	fi
	attempt=$(( attempt + 1 ))

	sleep 10;
done;
