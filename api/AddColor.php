<?php
	require_once __DIR__ . "/db.php";

	$inData = getRequestInfo();

	$color = $inData["color"];
	$userId = $inData["userId"];

	$conn = getDbConnection();
	if ($conn->connect_error)
	{
		returnWithError( $conn->connect_error );
	}
	else
	{
		$stmt = $conn->prepare("INSERT into Colors (UserId,Name) VALUES(?,?)");
		$stmt->bind_param("ss", $userId, $color);
		$stmt->execute();
		$stmt->close();
		$conn->close();
		returnWithError("");
	}

	function returnWithError( $err )
	{
		$retValue = '{"error":"' . $err . '"}';
		sendResultInfoAsJson( $retValue );
	}

?>
