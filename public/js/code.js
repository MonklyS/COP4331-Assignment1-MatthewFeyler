// Called from onclick handlers and the inline script in the HTML pages, which ESLint can't see.
/* exported doLogin, readCookie, doLogout, addColor, searchColor */
// `module` only exists when the Jest unit tests load this file (see the end of the file).
/* global module */

const urlBase = 'LAMPAPI';	// relative to the page, so no server hostname is hardcoded
const extension = 'php';

let userId = 0;
let firstName = "";
let lastName = "";

function doLogin()
{
	userId = 0;
	firstName = "";
	lastName = "";
	
	let login = document.getElementById("loginName").value;
	let password = document.getElementById("loginPassword").value;
//	var hash = md5( password );
	
	document.getElementById("loginResult").innerHTML = "";

	let tmp = {login:login,password:password};
//	var tmp = {login:login,password:hash};
	let jsonPayload = JSON.stringify( tmp );
	
	let url = urlBase + '/Login.' + extension;

	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function() 
		{
			if (this.readyState === 4 && this.status === 200) 
			{
				let jsonObject = JSON.parse( xhr.responseText );
				userId = jsonObject.id;
		
				if( userId < 1 )
				{		
					document.getElementById("loginResult").innerHTML = "User/Password combination incorrect";
					return;
				}
		
				firstName = jsonObject.firstName;
				lastName = jsonObject.lastName;

				saveCookie();
	
				window.location.href = "color.html";
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("loginResult").innerHTML = err.message;
	}

}

function saveCookie()
{
	let minutes = 20;
	let date = new Date();
	date.setTime(date.getTime()+(minutes*60*1000));	
	document.cookie = "firstName=" + firstName + ",lastName=" + lastName + ",userId=" + userId + ";expires=" + date.toGMTString();
}

// Splits the session cookie written by saveCookie() ("firstName=...,lastName=...,userId=...")
// into its fields. userId is -1 when the cookie has no id, which means nobody is logged in.
function parseUserCookie( cookie )
{
	let user = {firstName:"", lastName:"", userId:-1};
	let splits = cookie.split(",");
	for(let i = 0; i < splits.length; i++)
	{
		let thisOne = splits[i].trim();
		let tokens = thisOne.split("=");
		if( tokens[0] === "firstName" )
		{
			user.firstName = tokens[1];
		}
		else if( tokens[0] === "lastName" )
		{
			user.lastName = tokens[1];
		}
		else if( tokens[0] === "userId" )
		{
			user.userId = parseInt( tokens[1].trim() );
		}
	}
	return user;
}

function readCookie()
{
	let user = parseUserCookie( document.cookie );
	userId = user.userId;
	firstName = user.firstName;
	lastName = user.lastName;

	if( userId < 0 )
	{
		window.location.href = "index.html";
	}
	else
	{
//		document.getElementById("userName").innerHTML = "Logged in as " + firstName + " " + lastName;
	}
}

function doLogout()
{
	userId = 0;
	firstName = "";
	lastName = "";
	document.cookie = "firstName= ; expires = Thu, 01 Jan 1970 00:00:00 GMT";
	window.location.href = "index.html";
}

function addColor()
{
	let newColor = document.getElementById("colorText").value;
	document.getElementById("colorAddResult").innerHTML = "";

	let tmp = {color:newColor,userId:userId};
	let jsonPayload = JSON.stringify( tmp );

	let url = urlBase + '/AddColor.' + extension;
	
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function() 
		{
			if (this.readyState === 4 && this.status === 200) 
			{
				document.getElementById("colorAddResult").innerHTML = "Color has been added";
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("colorAddResult").innerHTML = err.message;
	}
	
}

// Joins the color names returned by SearchColors into the HTML shown under the search box,
// one color per line.
function formatColorList( colors )
{
	let colorList = "";
	for( let i=0; i<colors.length; i++ )
	{
		colorList += colors[i];
		if( i < colors.length - 1 )
		{
			colorList += "<br />\r\n";
		}
	}
	return colorList;
}

function searchColor()
{
	let srch = document.getElementById("searchText").value;
	document.getElementById("colorSearchResult").innerHTML = "";

	let tmp = {search:srch,userId:userId};
	let jsonPayload = JSON.stringify( tmp );

	let url = urlBase + '/SearchColors.' + extension;
	
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
	try
	{
		xhr.onreadystatechange = function() 
		{
			if (this.readyState === 4 && this.status === 200) 
			{
				let jsonObject = JSON.parse( xhr.responseText );
				
				// No matches: the API returns an error and no results array
				if( jsonObject.error )
				{
					document.getElementById("colorSearchResult").innerHTML = jsonObject.error;
					document.getElementsByTagName("p")[0].innerHTML = "";
					return;
				}
				
				document.getElementById("colorSearchResult").innerHTML = "Color(s) has been retrieved";
				document.getElementsByTagName("p")[0].innerHTML = formatColorList( jsonObject.results );
			}
		};
		xhr.send(jsonPayload);
	}
	catch(err)
	{
		document.getElementById("colorSearchResult").innerHTML = err.message;
	}
	
}

// Lets the Jest unit tests require() this file. Browsers have no `module`, so they skip this.
if( typeof module !== "undefined" )
{
	module.exports = { formatColorList, parseUserCookie };
}
