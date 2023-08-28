/* LICENSE START
 * 
 * MIT License
 * 
 * Copyright (c) 2019 Daimler TSS GmbH
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * LICENSE END 
 */

package com.daimler.data.controller;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.daimler.data.assembler.UserInfoAssembler;
import com.daimler.data.controller.LoginController.UserInfo;
import com.daimler.data.db.entities.UserInfoNsql;
import com.daimler.data.db.entities.UserRoleNsql;
import com.daimler.data.db.jsonb.UserInfoRole;
import com.daimler.data.dto.userinfo.UserInfoVO;
import com.daimler.data.service.userinfo.UserInfoService;
import com.daimler.data.service.userrole.UserRoleService;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import io.swagger.annotations.ApiResponse;
import io.swagger.annotations.ApiResponses;
import lombok.extern.slf4j.Slf4j;

@RestController
@Api(value = "UserInfo API", tags = { "users" })
@RequestMapping("/api")
@Slf4j
public class UserInfoController {

	private static Logger logger = LoggerFactory.getLogger(UserInfoController.class);
	
	@Autowired
	private UserInfoService userInfoService;
	
	@Autowired
	private UserRoleService userRoleService;
	
	@Autowired
	private UserInfoAssembler userinfoAssembler;
	
	@Value("${drd.request-url}")
	private String drdRequestUrl;
	
	@Lazy
	@Autowired
	private RestTemplate drdRestTemplate;
	
	@ApiOperation(value = "Get specific user for a given userid.", nickname = "getById", notes = "Get specific user for a given userid. This endpoints will be used to Get specific user for a given userid.", response = UserInfoVO.class, tags = {
			"users",})
	@ApiResponses(value = {
			@ApiResponse(code = 201, message = "Returns message of succes or failure", response = UserInfoVO.class),
			@ApiResponse(code = 400, message = "Malformed syntax."),
			@ApiResponse(code = 401, message = "Request does not have sufficient credentials."),
			@ApiResponse(code = 403, message = "Request is not authorized."),
			@ApiResponse(code = 405, message = "Invalid input"), @ApiResponse(code = 500, message = "Internal error")})
	@RequestMapping(value = "/users/{id}", produces = {"application/json"}, consumes = {
			"application/json"}, method = RequestMethod.GET)
	public ResponseEntity<UserInfoVO> getById(@RequestHeader("Authorization") String authToken,
			@ApiParam(value = "Id of the user for which information to be fetched", required = true) @PathVariable("id") String id) {
		UserInfoVO userInfoVO = null;
		if (id != null) {
			try {
			userInfoVO = this.fetchUserInfo(authToken, id);
			}catch(Exception e) {
				log.info("Failed to fetch/onboard user {}", id);
			}
			return new ResponseEntity<>(userInfoVO, HttpStatus.OK);
		} else {
			return new ResponseEntity<>(userInfoVO, HttpStatus.BAD_REQUEST);
		}
	}

	private UserInfoVO fetchUserInfo(String accessToken, String userId) {
		HttpHeaders headers = new HttpHeaders();
		headers.setAccept(Arrays.asList(MediaType.APPLICATION_JSON));
		headers.set("Authorization", "Bearer " + accessToken);
		HttpEntity<String> request = new HttpEntity<String>(headers);
		String id = "";
		UserInfo userInfo = new UserInfo();

		try {
			ResponseEntity<String> response = drdRestTemplate.exchange(drdRequestUrl + id, HttpMethod.GET, request,
					String.class);
			ObjectMapper mapper = new ObjectMapper();
			userInfo = mapper.readValue(response.getBody(), UserInfo.class);
			logger.info("Fetching user:{} from database.", userId);
			id = userInfo.getId();
		} catch (Exception e) {
			if (userId != null && userId.toLowerCase().startsWith("TE".toLowerCase())) {
				log.debug("Technical user {} , bypassed OIDC userinfo fetch", userId);
				id = userId;
			} else {
				log.error("Failed to fetch OIDC User info", e.getMessage());
			}
		}
		UserInfoVO userVO = userInfoService.getById(id);		
		if (Objects.isNull(userVO)) {
			logger.info("User not found, adding the user:{}", id);
			logger.debug("Setting default role as 'User' for: {}", id);
			UserRoleNsql roleEntity = userRoleService.getRoleUser();
			UserInfoRole userRole = new UserInfoRole();
			userRole.setId(roleEntity.getId());
			userRole.setName(roleEntity.getData().getName());
			List<UserInfoRole> userRoleList = new ArrayList<>();
			userRoleList.add(userRole);
			// Setting entity to add new user
			userInfo.setId(id != null ? id : userId);
			UserInfoNsql userEntity = userinfoAssembler.toEntity(userInfo, userRoleList);
			userEntity.setIsLoggedIn("Y");
			if (Objects.isNull(userInfo.getFirstName()) && Objects.isNull(userInfo.getLastName())) {
				logger.info("Null values provided, cannot add user:{}", userId);
				return null;
			}
			logger.info("Onboarding new user:{}", userId);
			userInfoService.addUser(userEntity);
			userVO = userinfoAssembler.toVo(userEntity);
		}

		return userVO;
	}
	

}
