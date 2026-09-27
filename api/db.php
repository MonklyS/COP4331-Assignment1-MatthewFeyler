<?php
	// Shared helpers for every endpoint in the API.
	require_once __DIR__ . "/config.php";

	function getDbConnection()
	{
		return new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
	}

	function getRequestInfo()
	{
		return json_decode(file_get_contents('php://input'), true);
	}

	function sendResultInfoAsJson( $obj )
	{
		header('Content-type: application/json');
		echo $obj;
	}
?>
